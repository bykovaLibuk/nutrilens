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

async function getAvailableModels(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data.models) {
      return data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace('models/', ''));
    }
  } catch (e) {
    console.warn("Failed to fetch models list", e);
  }
  return [];
}

export async function analyzeFood(apiKey, base64Image, mimeType = "image/jpeg") {
  const genAI = new GoogleGenerativeAI(apiKey);
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
  let modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro-vision", "gemini-2.0-flash", "gemini-2.5-flash"];
  
  let lastError;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt, imagePart]);
      let text = (await result.response).text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error.message);
      lastError = error;
      if (error.message.includes("API key not valid")) throw error; // Don't retry bad keys
    }
  }

  // If hardcoded models fail, try to fetch dynamic list
  const dynamicModels = await getAvailableModels(apiKey);
  for (const modelName of dynamicModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt, imagePart]);
      let text = (await result.response).text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.warn(`Dynamic model ${modelName} failed:`, error.message);
      lastError = error;
    }
  }

  if (dynamicModels.length > 0) {
    throw new Error(`Ваш ключ API работает, но не поддерживает генерацию. Доступные модели: ${dynamicModels.join(', ')}. Оригинальная ошибка: ${lastError.message}`);
  } else {
    throw new Error(`Ошибка: ${lastError.message}. Убедитесь, что ваш API ключ действителен и у вас не включен VPN, блокирующий Google.`);
  }
}

export async function analyzeRecipeOrLabel(apiKey, mode, data, mimeType = "image/jpeg") {
  const genAI = new GoogleGenerativeAI(apiKey);
  let prompt = "";
  let contentParts = [];
  let modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];

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
    contentParts = [prompt, data];
    // For text, gemini-pro is highly reliable as fallback
    modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-2.0-flash", "gemini-2.5-flash"];
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
    contentParts = [prompt, fileToGenerativePart(data, mimeType)];
    modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro-vision", "gemini-2.0-flash", "gemini-2.5-flash"];
  }

  let lastError;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(contentParts);
      let text = (await result.response).text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error.message);
      lastError = error;
      if (error.message.includes("API key not valid")) throw error;
    }
  }

  // Fallback to dynamic models from API
  const dynamicModels = await getAvailableModels(apiKey);
  for (const modelName of dynamicModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(contentParts);
      let text = (await result.response).text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.warn(`Dynamic model ${modelName} failed:`, error.message);
      lastError = error;
    }
  }
  
  if (dynamicModels.length > 0) {
    throw new Error(`Ваш ключ API работает, но модели отклоняют запрос. Доступны: [${dynamicModels.join(', ')}]. Последняя ошибка: ${lastError.message}`);
  } else {
    throw new Error(`Ошибка: ${lastError.message}. Похоже, ваш ключ не имеет доступа к моделям или вы используете старый проект Google Cloud.`);
  }
}
