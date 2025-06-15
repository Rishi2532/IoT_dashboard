// Quick test to verify region detection logic
const extractRegion = (text) => {
  const normalizedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
  console.log(`Normalized text: "${normalizedText}"`);

  const regionMap = {
    amravati: "Amravati",
    nagpur: "Nagpur", 
    nashik: "Nashik",
    nasik: "Nashik",
    pune: "Pune",
    poona: "Pune",
    konkan: "Konkan",
    mumbai: "Mumbai",
    bombay: "Mumbai",
    "chhatrapati sambhajinagar": "Chhatrapati Sambhajinagar",
    sambhajinagar: "Chhatrapati Sambhajinagar",
    aurangabad: "Chhatrapati Sambhajinagar",
    " amravati ": "Amravati",
    " nagpur ": "Nagpur",
    " nashik ": "Nashik",
    " nasik ": "Nashik",
    " pune ": "Pune",
    " konkan ": "Konkan",
    " mumbai ": "Mumbai",
    "in nagpur": "Nagpur",
    "in pune": "Pune",
    "in nashik": "Nashik",
    "in amravati": "Amravati",
    "in konkan": "Konkan",
    "in mumbai": "Mumbai",
    "in aurangabad": "Chhatrapati Sambhajinagar",
    "in sambhajinagar": "Chhatrapati Sambhajinagar"
  };

  for (const [key, value] of Object.entries(regionMap)) {
    if (key.length <= 4) {
      const pattern = new RegExp(`\\b${key}\\b`, 'i');
      if (pattern.test(normalizedText)) {
        console.log(`✓ Matched '${key}' -> ${value}`);
        return value;
      }
    } else if (normalizedText.includes(key)) {
      console.log(`✓ Matched '${key}' -> ${value}`);
      return value;
    }
  }
  return null;
};

// Test cases
console.log("Testing region detection:");
console.log("Nagpur:", extractRegion("Nagpur"));
console.log("nashik:", extractRegion("nashik"));
console.log("Nashik:", extractRegion("Nashik"));
console.log("NASHIK:", extractRegion("NASHIK"));
console.log("pune:", extractRegion("pune"));
console.log("amravati:", extractRegion("amravati"));