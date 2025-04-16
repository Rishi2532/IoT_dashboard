class ActionProvider {
  createChatBotMessage: any;
  setState: any;
  createClientMessage: any;

  constructor(createChatBotMessage: any, setStateFunc: any, createClientMessage: any) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
    this.createClientMessage = createClientMessage;
  }

  // Helper to update chatbot state
  updateState = (schemes: any[] = [], regions: any[] = [], regionSummary: any = null, selectedRegion: string = "all") => {
    this.setState(state => ({
      ...state,
      schemes,
      regions,
      regionSummary,
      selectedRegion
    }));
  };

  // Helper to add a bot message to the chat
  addMessage = (message: string, widget: string | null = null) => {
    const botMessage = this.createChatBotMessage(message, widget ? { widget } : {});
    this.setState((state: any) => ({
      ...state,
      messages: [...state.messages, botMessage],
    }));
  };

  // Handle greeting messages
  handleGreeting = () => {
    this.addMessage("Hello! 👋 I'm your Maharashtra Water Infrastructure Assistant. I can help you with information about water schemes, regional statistics, and more. What would you like to know?", "welcomeOptions");
  };

  // Handle help requests
  handleHelp = () => {
    this.addMessage(
      "Here are some things I can help you with:\n\n" +
      "- Show fully completed schemes\n" +
      "- Show schemes in a specific region (e.g., Nagpur)\n" +
      "- Provide region summary statistics\n" +
      "- Filter schemes by status\n" +
      "- Compare regions\n" +
      "- Show details for a specific scheme\n" +
      "- Count schemes or villages\n" +
      "- Provide information on ESR integration or flow meters\n\n" +
      "Just ask me what you need!",
      "welcomeOptions"
    );
  };

  // Handle showing fully completed schemes
  handleShowFullyCompletedSchemes = async () => {
    this.addMessage("Fetching fully completed schemes...");
    
    try {
      const response = await fetch('/api/schemes?status=Fully Completed');
      const schemes = await response.json();
      
      this.updateState(schemes);
      
      if (schemes.length > 0) {
        this.addMessage(
          `I found ${schemes.length} fully completed schemes. Here are the details:`,
          "schemeStatus"
        );
      } else {
        this.addMessage("I couldn't find any fully completed schemes in the database.");
      }
    } catch (error) {
      console.error("Error fetching fully completed schemes:", error);
      this.addMessage("Sorry, I encountered an error while fetching fully completed schemes. Please try again later.");
    }
  };

  // Handle showing schemes by region
  handleSchemesByRegion = async (region: string) => {
    // Capitalize the first letter of each word in the region name
    const formattedRegion = region
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
    this.addMessage(`Fetching schemes in ${formattedRegion} region...`);
    
    try {
      const response = await fetch(`/api/schemes?region=${encodeURIComponent(formattedRegion)}`);
      const schemes = await response.json();
      
      this.updateState(schemes, [], null, formattedRegion);
      
      if (schemes.length > 0) {
        this.addMessage(
          `I found ${schemes.length} schemes in ${formattedRegion} region. Here are the details:`,
          "schemeStatus"
        );
      } else {
        this.addMessage(`I couldn't find any schemes in ${formattedRegion} region. Please check the region name and try again.`);
      }
    } catch (error) {
      console.error(`Error fetching schemes for ${formattedRegion} region:`, error);
      this.addMessage(`Sorry, I encountered an error while fetching schemes for ${formattedRegion} region. Please try again later.`);
    }
  };

  // Handle showing region summary statistics
  handleRegionSummary = async () => {
    this.addMessage("Fetching region summary statistics...");
    
    try {
      // Fetch regions data
      const regionsResponse = await fetch('/api/regions');
      const regions = await regionsResponse.json();
      
      // Fetch summary data
      const summaryResponse = await fetch('/api/regions/summary');
      const summary = await summaryResponse.json();
      
      this.updateState([], regions, summary);
      
      if (regions.length > 0) {
        this.addMessage(
          "Here are the summary statistics for all regions:",
          "regionStatistics"
        );
      } else {
        this.addMessage("I couldn't find any region data in the database.");
      }
    } catch (error) {
      console.error("Error fetching region summary:", error);
      this.addMessage("Sorry, I encountered an error while fetching region summary statistics. Please try again later.");
    }
  };

  // Handle filtering schemes by status
  handleFilterByStatus = async (status: string) => {
    // Capitalize the first letter of each word in the status
    const formattedStatus = status
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
    this.addMessage(`Fetching schemes with status "${formattedStatus}"...`);
    
    try {
      const response = await fetch(`/api/schemes?status=${encodeURIComponent(formattedStatus)}`);
      const schemes = await response.json();
      
      this.updateState(schemes);
      
      if (schemes.length > 0) {
        this.addMessage(
          `I found ${schemes.length} schemes with status "${formattedStatus}". Here are the details:`,
          "schemeStatus"
        );
      } else {
        this.addMessage(`I couldn't find any schemes with status "${formattedStatus}". Please check the status and try again.`);
      }
    } catch (error) {
      console.error(`Error fetching schemes with status ${formattedStatus}:`, error);
      this.addMessage(`Sorry, I encountered an error while fetching schemes with status "${formattedStatus}". Please try again later.`);
    }
  };

  // Handle comparing regions
  handleCompareRegions = async (region1: string, region2: string) => {
    // Capitalize the first letter of each word in the region names
    const formattedRegion1 = region1
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
    const formattedRegion2 = region2
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
    this.addMessage(`Comparing ${formattedRegion1} and ${formattedRegion2} regions...`);
    
    try {
      const response = await fetch('/api/regions');
      const regions = await response.json();
      
      const region1Data = regions.find((r: any) => r.region_name === formattedRegion1);
      const region2Data = regions.find((r: any) => r.region_name === formattedRegion2);
      
      if (region1Data && region2Data) {
        // Prepare comparison data
        const comparisonRegions = [region1Data, region2Data];
        this.updateState([], comparisonRegions);
        
        this.addMessage(
          `Here's a comparison between ${formattedRegion1} and ${formattedRegion2} regions:`,
          "regionStatistics"
        );
      } else {
        if (!region1Data && !region2Data) {
          this.addMessage(`I couldn't find data for either ${formattedRegion1} or ${formattedRegion2} regions. Please check the region names and try again.`);
        } else if (!region1Data) {
          this.addMessage(`I couldn't find data for ${formattedRegion1} region. Please check the region name and try again.`);
        } else {
          this.addMessage(`I couldn't find data for ${formattedRegion2} region. Please check the region name and try again.`);
        }
      }
    } catch (error) {
      console.error(`Error comparing regions ${formattedRegion1} and ${formattedRegion2}:`, error);
      this.addMessage(`Sorry, I encountered an error while comparing ${formattedRegion1} and ${formattedRegion2} regions. Please try again later.`);
    }
  };

  // Handle showing scheme details
  handleSchemeDetails = async (schemeId: string) => {
    this.addMessage(`Fetching details for scheme "${schemeId}"...`);
    
    try {
      const response = await fetch(`/api/schemes?scheme_id=${encodeURIComponent(schemeId)}`);
      const schemes = await response.json();
      
      if (schemes.length > 0) {
        this.updateState(schemes);
        this.addMessage(
          `Here are the details for scheme "${schemeId}":`,
          "schemeStatus"
        );
      } else {
        this.addMessage(`I couldn't find any scheme with ID "${schemeId}". Please check the scheme ID and try again.`);
      }
    } catch (error) {
      console.error(`Error fetching details for scheme ${schemeId}:`, error);
      this.addMessage(`Sorry, I encountered an error while fetching details for scheme "${schemeId}". Please try again later.`);
    }
  };

  // Handle counting schemes
  handleSchemeCount = async (region: string = 'all') => {
    let messageText = "Counting the total number of schemes";
    let endpoint = '/api/schemes';
    
    if (region !== 'all') {
      // Capitalize the first letter of each word in the region name
      const formattedRegion = region
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
        
      messageText += ` in ${formattedRegion} region`;
      endpoint += `?region=${encodeURIComponent(formattedRegion)}`;
    }
    
    this.addMessage(`${messageText}...`);
    
    try {
      const response = await fetch(endpoint);
      const schemes = await response.json();
      
      if (region === 'all') {
        this.addMessage(`There are a total of ${schemes.length} schemes in the database.`);
      } else {
        // Capitalize the first letter of each word in the region name
        const formattedRegion = region
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
          
        this.addMessage(`There are ${schemes.length} schemes in ${formattedRegion} region.`);
        
        // If there are schemes, update the state to show the schemes
        if (schemes.length > 0) {
          this.updateState(schemes, [], null, formattedRegion);
          this.addMessage("Here are the details:", "schemeStatus");
        }
      }
    } catch (error) {
      console.error(`Error counting schemes:`, error);
      this.addMessage(`Sorry, I encountered an error while counting schemes. Please try again later.`);
    }
  };

  // Handle counting villages
  handleVillageCount = async (region: string = 'all') => {
    let messageText = "Counting the total number of villages";
    let endpoint = '/api/regions/summary';
    
    if (region !== 'all') {
      // Capitalize the first letter of each word in the region name
      const formattedRegion = region
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
        
      messageText += ` in ${formattedRegion} region`;
      endpoint += `?region=${encodeURIComponent(formattedRegion)}`;
    }
    
    this.addMessage(`${messageText}...`);
    
    try {
      const response = await fetch(endpoint);
      const summary = await response.json();
      
      if (region === 'all') {
        this.addMessage(`There are a total of ${summary.total_villages_integrated} villages integrated, with ${summary.fully_completed_villages} fully completed.`);
      } else {
        // Capitalize the first letter of each word in the region name
        const formattedRegion = region
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
          
        const regionsResponse = await fetch('/api/regions');
        const regions = await regionsResponse.json();
        
        const regionData = regions.find((r: any) => r.region_name === formattedRegion);
        
        if (regionData) {
          this.addMessage(`In ${formattedRegion} region, there are ${regionData.total_villages_integrated} villages integrated, with ${regionData.fully_completed_villages} fully completed.`);
        } else {
          this.addMessage(`I couldn't find data for ${formattedRegion} region. Please check the region name and try again.`);
        }
      }
    } catch (error) {
      console.error(`Error counting villages:`, error);
      this.addMessage(`Sorry, I encountered an error while counting villages. Please try again later.`);
    }
  };

  // Handle ESR queries
  handleESRQuery = async (message: string) => {
    this.addMessage("Let me find information about ESR integration...");
    
    try {
      // Fetch summary data
      const summaryResponse = await fetch('/api/regions/summary');
      const summary = await summaryResponse.json();
      
      // Fetch regions data
      const regionsResponse = await fetch('/api/regions');
      const regions = await regionsResponse.json();
      
      this.updateState([], regions, summary);
      
      if (message.includes("count") || message.includes("how many")) {
        this.addMessage(`There are a total of ${summary.total_esr_integrated} ESRs integrated across all regions, with ${summary.fully_completed_esr} fully completed and ${summary.partial_esr} partially completed.`);
      } else {
        this.addMessage(
          "Here's the ESR integration data for all regions:",
          "regionStatistics"
        );
      }
    } catch (error) {
      console.error("Error handling ESR query:", error);
      this.addMessage("Sorry, I encountered an error while fetching ESR data. Please try again later.");
    }
  };

  // Handle flow meter queries
  handleFlowMeterQuery = async (message: string) => {
    this.addMessage("Let me find information about flow meters...");
    
    try {
      // Fetch summary data
      const summaryResponse = await fetch('/api/regions/summary');
      const summary = await summaryResponse.json();
      
      // Fetch regions data
      const regionsResponse = await fetch('/api/regions');
      const regions = await regionsResponse.json();
      
      this.updateState([], regions, summary);
      
      if (message.includes("count") || message.includes("how many")) {
        this.addMessage(`There are a total of ${summary.flow_meter_integrated} flow meters integrated across all regions.`);
      } else {
        this.addMessage(
          "Here's the flow meter integration data for all regions:",
          "regionStatistics"
        );
      }
    } catch (error) {
      console.error("Error handling flow meter query:", error);
      this.addMessage("Sorry, I encountered an error while fetching flow meter data. Please try again later.");
    }
  };

  // Handle unknown queries
  handleUnknownQuery = (message: string) => {
    this.addMessage("I'm not sure I understand that query. Could you try rephrasing it or select one of these common questions?", "welcomeOptions");
  };
}

export default ActionProvider;