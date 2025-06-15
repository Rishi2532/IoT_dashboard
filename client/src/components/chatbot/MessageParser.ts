class MessageParser {
  actionProvider: any;
  state: any;

  constructor(actionProvider: any, state: any) {
    this.actionProvider = actionProvider;
    this.state = state;
  }

  private regionNames = [
    'amravati', 
    'nagpur', 
    'chhatrapati sambhajinagar',
    'aurangabad', // alias for Chhatrapati Sambhajinagar
    'nashik', 
    'pune', 
    'konkan',
    'mumbai'
  ];

  parse(message: string) {
    const lowerCaseMessage = message.toLowerCase();

    // Detect region from message
    const detectedRegion = this.detectRegion(lowerCaseMessage, this.regionNames);
    
    // Check if this is a simple region mention for filtering
    if (detectedRegion && this.isSimpleRegionMention(lowerCaseMessage, detectedRegion)) {
      return this.actionProvider.handleRegionFilter(detectedRegion);
    }

    // Handle greetings
    if (
      lowerCaseMessage.includes('hello') ||
      lowerCaseMessage.includes('hi') ||
      lowerCaseMessage.includes('hey') ||
      lowerCaseMessage.includes('greetings')
    ) {
      return this.actionProvider.handleGreeting();
    }

    // Handle help requests
    if (
      lowerCaseMessage.includes('help') ||
      lowerCaseMessage.includes('assist') ||
      lowerCaseMessage.includes('support') ||
      lowerCaseMessage.includes('guide') ||
      lowerCaseMessage.includes('what can you do')
    ) {
      return this.actionProvider.handleHelp();
    }

    // Handle showing fully completed schemes
    if (
      lowerCaseMessage.includes('fully completed') ||
      (lowerCaseMessage.includes('completed') && lowerCaseMessage.includes('scheme'))
    ) {
      return this.actionProvider.handleShowFullyCompletedSchemes();
    }

    // Handle region-specific data queries with page context awareness
    if (detectedRegion) {
      // Check for specific data type mentions
      if (this.isChlorineQuery(lowerCaseMessage)) {
        return this.actionProvider.handleRegionDataQuery(detectedRegion, 'chlorine');
      }
      if (this.isPressureQuery(lowerCaseMessage)) {
        return this.actionProvider.handleRegionDataQuery(detectedRegion, 'pressure');
      }
      if (this.isLpcdQuery(lowerCaseMessage)) {
        return this.actionProvider.handleRegionDataQuery(detectedRegion, 'lpcd');
      }
      if (this.isWaterDataQuery(lowerCaseMessage)) {
        return this.actionProvider.handleRegionDataQuery(detectedRegion, 'water');
      }
      
      // Default to page context-aware query
      return this.actionProvider.handleRegionContextQuery(detectedRegion);
    }

    // Handle region summary statistics
    if (
      lowerCaseMessage.includes('region summary') ||
      lowerCaseMessage.includes('summary') ||
      lowerCaseMessage.includes('statistics') ||
      lowerCaseMessage.includes('stats')
    ) {
      return this.actionProvider.handleRegionSummary();
    }

    // Handle counting schemes
    if (
      lowerCaseMessage.includes('how many scheme') ||
      lowerCaseMessage.includes('count scheme') ||
      lowerCaseMessage.includes('number of scheme') ||
      lowerCaseMessage.includes('total scheme')
    ) {
      // Check if this is region specific
      for (const region of this.regionNames) {
        if (lowerCaseMessage.includes(region)) {
          return this.actionProvider.handleSchemeCount(region);
        }
      }
      return this.actionProvider.handleSchemeCount();
    }

    // Handle counting villages
    if (
      lowerCaseMessage.includes('how many village') ||
      lowerCaseMessage.includes('count village') ||
      lowerCaseMessage.includes('number of village') ||
      lowerCaseMessage.includes('total village')
    ) {
      // Check if this is region specific
      for (const region of this.regionNames) {
        if (lowerCaseMessage.includes(region)) {
          return this.actionProvider.handleVillageCount(region);
        }
      }
      return this.actionProvider.handleVillageCount();
    }

    // Handle ESR queries
    if (
      lowerCaseMessage.includes('esr') ||
      lowerCaseMessage.includes('elevated storage reservoir')
    ) {
      return this.actionProvider.handleESRQuery(lowerCaseMessage);
    }

    // Extract region from message if present
    let matchedRegion = null;
    for (const region of this.regionNames) {
      if (lowerCaseMessage.includes(region)) {
        matchedRegion = region;
        break;
      }
    }

    // Handle flow meter queries
    if (
      lowerCaseMessage.includes('flow meter') ||
      lowerCaseMessage.includes('meter') ||
      lowerCaseMessage.includes('flow')
    ) {
      return this.actionProvider.handleFlowMeterQuery(lowerCaseMessage, matchedRegion);
    }

    // Handle chlorine analyzer queries
    if (
      lowerCaseMessage.includes('chlorine') ||
      lowerCaseMessage.includes('rca') ||
      lowerCaseMessage.includes('analyzer')
    ) {
      return this.actionProvider.handleRCAQuery(lowerCaseMessage, matchedRegion);
    }

    // Handle pressure transmitter queries
    if (
      lowerCaseMessage.includes('pressure') ||
      lowerCaseMessage.includes('transmitter')
    ) {
      return this.actionProvider.handlePressureTransmitterQuery(lowerCaseMessage, matchedRegion);
    }

    // Handle comparing regions
    if (lowerCaseMessage.includes('compare')) {
      const regions = [];
      for (const region of this.regionNames) {
        if (lowerCaseMessage.includes(region)) {
          regions.push(region);
        }
      }

      if (regions.length >= 2) {
        return this.actionProvider.handleCompareRegions(regions[0], regions[1]);
      }
    }

    // Handle unknown queries with basic NLP using cosine similarity
    this.processWithNLP(lowerCaseMessage);
  }

  // Process messages using TensorFlow.js for NLP (Natural Language Processing)
  async processWithNLP(message: string) {
    try {
      // Simple keyword matching as fallback
      this.actionProvider.handleUnknownQuery(message);

      // In a full implementation, this would use the TensorFlow Universal Sentence Encoder
      // to calculate semantic similarity between the user query and predefined intents
    } catch (error) {
      console.error("Error in NLP processing:", error);
      this.actionProvider.handleUnknownQuery(message);
    }
  }

  // Helper method to detect region in message
  detectRegion(message: string, regionNames: string[]): string | null {
    for (const region of regionNames) {
      if (message.includes(region)) {
        // Handle alias mapping
        if (region === 'aurangabad') {
          return 'chhatrapati sambhajinagar';
        }
        return region;
      }
    }
    return null;
  }

  // Check if this is a simple region mention (just the region name or basic query)
  isSimpleRegionMention(message: string, region: string): boolean {
    const trimmedMessage = message.trim();
    const regionWords = region.split(' ');
    
    // If message is just the region name
    if (trimmedMessage === region) return true;
    
    // If message is short and mainly contains the region
    const words = trimmedMessage.split(' ');
    const regionWordCount = regionWords.length;
    const totalWords = words.length;
    
    // Simple heuristic: if region takes up most of the message
    if (totalWords <= regionWordCount + 2) return true;
    
    return false;
  }

  // Check if message is asking about chlorine data
  isChlorineQuery(message: string): boolean {
    return message.includes('chlorine') || 
           message.includes('rca') || 
           message.includes('residual chlorine') ||
           message.includes('analyzer');
  }

  // Check if message is asking about pressure data
  isPressureQuery(message: string): boolean {
    return message.includes('pressure') || 
           message.includes('transmitter') ||
           message.includes('bar');
  }

  // Check if message is asking about LPCD data
  isLpcdQuery(message: string): boolean {
    return message.includes('lpcd') || 
           message.includes('liter') ||
           message.includes('capita') ||
           message.includes('per day');
  }

  // Check if message is asking about general water data
  isWaterDataQuery(message: string): boolean {
    return message.includes('water') && !this.isChlorineQuery(message) && !this.isPressureQuery(message);
  }
}

export default MessageParser;