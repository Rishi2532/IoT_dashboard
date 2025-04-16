import { createChatBotMessage } from 'react-chatbot-kit';

// Define the configuration object
const config = {
  initialMessages: [
    createChatBotMessage("Hello! I'm your Maharashtra Water Infrastructure Assistant. How can I help you today?", {
      delay: 500,
      widget: "welcomeOptions",
    }),
  ],
  botName: "Water Infrastructure Assistant",
  customStyles: {
    botMessageBox: {
      backgroundColor: "#2563eb",
    },
    chatButton: {
      backgroundColor: "#2563eb",
    },
  },
  widgets: [
    {
      widgetName: "schemeStatus",
      widgetFunc: (props) => {
        return {
          props,
          type: "schemeStatus",
        };
      },
      mapStateToProps: ["schemes", "selectedRegion"],
    },
    {
      widgetName: "regionStatistics",
      widgetFunc: (props) => {
        return {
          props,
          type: "regionStatistics",
        };
      },
      mapStateToProps: ["regions", "regionSummary"],
    },
    {
      widgetName: "mapView",
      widgetFunc: (props) => {
        return {
          props,
          type: "mapView",
        };
      },
      mapStateToProps: ["regions", "selectedRegion"],
    },
    {
      widgetName: "welcomeOptions",
      widgetFunc: (props) => {
        return {
          props,
          type: "welcomeOptions",
        };
      },
      mapStateToProps: [],
    },
  ],
  state: {
    schemes: [],
    regions: [],
    regionSummary: null,
    selectedRegion: "all",
  }
};

export default config;