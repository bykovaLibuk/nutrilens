import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to convert base64 to generative part
function fileToGenerativePart(base64Image, mimeType) {
  // Remove data URL prefix if present
  const base64Data = base64Image.split(',')[1] || base64Image;
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
}

export async function analyzeFood(apiKey, base64Image, mimeType = "image/jpeg") {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    You are an expert nutritionist. Analyze this photo of food.
    Identify the main foods shown and estimate their nutritional values for the ENTIRE visible portion.
    
    Return ONLY a valid JSON object with the following structure (no markdown, no backticks, no other text):
    {
      "name": "Short descriptive name of the meal",
      "calories": number (total estimated calories),
      "protein": number (total protein in grams),
      "carbs": number (total carbohydrates in grams),
      "fat": number (total fat in grams)
    }
    `;

    const imagePart = fileToGenerativePart(base64Image, mimeType);
    
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text();
    
    // Clean up potential markdown formatting
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function analyzeRecipeOrLabel(apiKey, mode, data, mimeType = "image/jpeg") {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = "";
    let contentParts = [];

    if (mode === 'text_recipe') {
      prompt = `
      You are an expert nutritionist. I am giving you a recipe with ingredients and their weights. 
      Calculate the total macros for the entire recipe, and then calculate the macros per 100 grams of the FINAL COOKED dish. 
      If the user didn't specify cooked weight, assume a 15% weight loss from cooking for meats/veggies, or use your best judgment.
      
      Return ONLY a JSON object:
      {
        "name": "Generated name of the dish",
        "calories": total calories for 100g of cooked dish,
        "protein": protein per 100g,
        "carbs": carbs per 100g,
        "fat": fat per 100g,
        "totalWeight": estimated final cooked weight in grams
      }
      `;
      contentParts = [prompt, data]; // data is text
    } else if (mode === 'image_label') {
      prompt = `
      Read this photo of a food product's nutrition label or barcode area.
      Extract the nutritional values PER 100 GRAMS. If the label only shows per serving, calculate it for 100g.
      
      Return ONLY a JSON object:
      {
        "name": "Brand and Product Name",
        "calories": calories per 100g,
        "protein": protein per 100g,
        "carbs": carbs per 100g,
        "fat": fat per 100g
      }
      `;
      contentParts = [prompt, fileToGenerativePart(data, mimeType)]; // data is base64
    }

    const result = await model.generateContent(contentParts);
    let text = (await result.response).text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Recipe/Label Error:", error);
    throw error;
  }
}
