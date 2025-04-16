class MessageParser {
  actionProvider: any;
  state: any;

  constructor(actionProvider: any, state: any) {
    this.actionProvider = actionProvider;
    this.state = state;
  }

  parse(message: string) {
    const lowerCaseMessage = message.toLowerCase();

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

    // Handle region-specific queries
    const regionNames = [
      'amravati', 
      'nagpur', 
      'chhatrapati sambhajinagar', 
      'nashik', 
      'pune', 
      'konkan',
      'mumbai'
    ];
    
    for (const region of regionNames) {
      if (lowerCaseMessage.includes(region)) {
        return this.actionProvider.handleSchemesByRegion(region);
      }
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
      for (const region of regionNames) {
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
      for (const region of regionNames) {
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

    // Handle flow meter queries
    if (
      lowerCaseMessage.includes('flow meter') ||
      lowerCaseMessage.includes('meter') ||
      lowerCaseMessage.includes('flow')
    ) {
      return this.actionProvider.handleFlowMeterQuery(lowerCaseMessage);
    }

    // Handle comparing regions
    if (lowerCaseMessage.includes('compare')) {
      const regions = [];
      for (const region of regionNames) {
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
}

export default MessageParser;