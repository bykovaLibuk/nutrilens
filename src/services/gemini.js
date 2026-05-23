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

export async function analyzeFood(apiKey, base64Image, mimeType = "image/jpeg", userHint = "") {
  const genAI = new GoogleGenerativeAI(apiKey);
  let prompt = `
  You are an expert nutritionist. Analyze this photo of food.
  Identify the main foods shown and estimate their nutritional values for the ENTIRE visible portion.
  `;

  if (userHint && userHint.trim()) {
    prompt += `
    CRITICAL CONTEXT FROM THE USER:
    The user described this food/portion as: "${userHint}". 
    Use this description to guide your analysis, identify the exact ingredients, and scale the portion sizes/weights accordingly.
    Even if the food is hard to see or identify from the photo alone, rely heavily on this text context to estimate the calories and macros accurately.
    `;
  }

  prompt += `
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

export async function analyzeProgressData(apiKey, profile, measurements, foodHistory) {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Format data compactly to stay within tokens and optimize performance
  const cleanProfile = {
    height: profile.height || 175,
    age: profile.age || 25,
    gender: profile.gender === 0 ? "Женский" : "Мужской",
    isAthlete: profile.isAthlete ? "Спортсмен" : "Обычный"
  };
  
  const cleanMeasurements = (measurements || []).map(m => ({
    date: m.date ? new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : "",
    weight: m.weight ? parseFloat(m.weight) : null,
    fat: m.fat ? parseFloat(m.fat) : null,
    muscle: m.muscle ? parseFloat(m.muscle) : null,
    waist: m.waist ? parseFloat(m.waist) : null
  })).reverse().slice(-15); // Last 15 measurements in chronological order
  
  const cleanHistory = (foodHistory || []).map(f => ({
    date: f.timestamp ? new Date(f.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : "",
    name: f.name,
    calories: f.calories,
    protein: f.protein,
    fat: f.fat,
    carbs: f.carbs
  })).reverse().slice(-40); // Last 40 food items in chronological order
  
  const prompt = `
  Ты - Персональный ИИ-Аналитик Здоровья NutriLens. Твоя задача - проанализировать данные прогресса пользователя и составить профессиональный отчет на русском языке.
  
  Физический профиль пользователя:
  ${JSON.stringify(cleanProfile, null, 2)}
  
  История взвешиваний и состава тела (в хронологическом порядке):
  ${JSON.stringify(cleanMeasurements, null, 2)}
  
  История питания и КБЖУ (в хронологическом порядке):
  ${JSON.stringify(cleanHistory, null, 2)}
  
  Проведи анализ по следующим направлениям:
  1. Динамика веса и состава тела: снижается/растет ли вес, что происходит с жировой массой и мышечной массой?
  2. Качество питания и баланс КБЖУ: хватает ли белков, есть ли резкие скачки калорийности?
  3. Персональные практические рекомендации: корректировка калорийности, гидратации, активности.
  4. Предупреждения: слишком быстрый сброс веса, экстремально низкая калорийность, сильные перекосы в макросах.
  
  Обязательно верни ТОЛЬКО валидный JSON-объект (без разметки markdown, без бэктиков \`\`\`json, без пояснительного текста) со следующей структурой:
  {
    "statusEmoji": "один смайлик, наиболее подходящий текущему состоянию (например, 🎯, 💪, ⚠️, ⚖️)",
    "statusTitle": "Короткий заголовок статуса на русском (например, 'Отличная динамика', 'Нужно стабилизировать калории')",
    "summary": "Общее резюме прогресса пользователя (2-3 предложения на русском)",
    "compositionAnalysis": "Анализ состава тела и изменений веса (2-3 предложения на русском)",
    "nutritionAnalysis": "Детальный анализ рациона и баланса БЖУ (2-3 предложения на русском)",
    "recommendations": ["Рекомендация 1 на русском", "Рекомендация 2 на русском", "Рекомендация 3 на русском"],
    "warnings": ["Предупреждение 1 на русском (если применимо, иначе оставь массив пустым)", "Предупреждение 2 на русском"]
  }
  `;
  
  let modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-pro"];
  
  let lastError;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt]);
      let text = (await result.response).text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error.message);
      lastError = error;
      if (error.message.includes("API key not valid")) throw error;
    }
  }

  // Fallback to dynamic models list
  const dynamicModels = await getAvailableModels(apiKey);
  for (const modelName of dynamicModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt]);
      let text = (await result.response).text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.warn(`Dynamic model ${modelName} failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(lastError ? lastError.message : "Не удалось выполнить анализ данных.");
}
