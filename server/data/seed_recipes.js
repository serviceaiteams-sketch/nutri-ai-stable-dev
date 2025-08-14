// Recipe data for seeding the database
const recipesData = [
  {
    name: "Classic Spaghetti Carbonara",
    description: "A classic Roman pasta dish made with eggs, hard cheese, cured pork, and black pepper.",
    cuisine: "italian",
    prep_time: 15,
    cook_time: 20,
    servings: 2,
    calories: 600,
    protein: 30,
    carbs: 50,
    fat: 35,
    sugar: 2,
    sodium: 800,
    fiber: 3,
    ingredients: JSON.stringify([
      { name: "Spaghetti", quantity: 200, unit: "g" },
      { name: "Guanciale or Pancetta", quantity: 100, unit: "g" },
      { name: "Eggs", quantity: 2, unit: "large" },
      { name: "Pecorino Romano cheese", quantity: 50, unit: "g" },
      { name: "Black pepper", quantity: 2, unit: "tsp" }
    ]),
    instructions: JSON.stringify([
      "Cook spaghetti according to package directions.",
      "Meanwhile, cut guanciale into small cubes and cook in a pan until crispy. Remove from pan, leaving the fat.",
      "In a bowl, whisk eggs, grated Pecorino Romano, and black pepper.",
      "Drain spaghetti, reserving some pasta water. Add spaghetti to the pan with guanciale fat.",
      "Quickly add the egg mixture and a splash of pasta water. Toss vigorously until creamy. Add guanciale back in.",
      "Serve immediately, garnished with more Pecorino and black pepper."
    ]),
    tags: JSON.stringify(["italian", "pasta_based", "comfort_food", "high_protein"]),
    image_url: "https://example.com/carbonara.jpg",
    source_url: "https://example.com/carbonara-recipe"
  },
  {
    name: "Authentic Indian Chicken Curry",
    description: "A rich and aromatic chicken curry, slow-cooked in a spiced tomato and onion gravy.",
    cuisine: "indian",
    prep_time: 30,
    cook_time: 60,
    servings: 4,
    calories: 450,
    protein: 40,
    carbs: 25,
    fat: 20,
    sugar: 5,
    sodium: 700,
    fiber: 5,
    ingredients: JSON.stringify([
      { name: "Chicken thighs", quantity: 500, unit: "g" },
      { name: "Onions", quantity: 2, unit: "medium" },
      { name: "Tomatoes", quantity: 3, unit: "medium" },
      { name: "Ginger-garlic paste", quantity: 2, unit: "tbsp" },
      { name: "Yogurt", quantity: 100, unit: "g" },
      { name: "Garam Masala", quantity: 1, unit: "tbsp" },
      { name: "Turmeric powder", quantity: 1, unit: "tsp" },
      { name: "Red chili powder", quantity: 1, unit: "tsp" }
    ]),
    instructions: JSON.stringify([
      "Marinate chicken with yogurt and spices for at least 30 minutes.",
      "Sauté onions until golden brown. Add ginger-garlic paste.",
      "Add chopped tomatoes and cook until soft and oil separates.",
      "Add marinated chicken and cook until browned. Add a little water and simmer until chicken is cooked through and gravy thickens.",
      "Garnish with fresh coriander and serve with rice or naan."
    ]),
    tags: JSON.stringify(["indian", "non_vegetarian", "spicy", "rich_sauce", "high_protein"]),
    image_url: "https://example.com/indian-chicken-curry.jpg",
    source_url: "https://example.com/indian-chicken-curry-recipe"
  },
  {
    name: "Vegetable Fried Rice",
    description: "A quick and easy stir-fried rice dish with mixed vegetables and soy sauce.",
    cuisine: "chinese",
    prep_time: 10,
    cook_time: 15,
    servings: 2,
    calories: 380,
    protein: 10,
    carbs: 60,
    fat: 12,
    sugar: 5,
    sodium: 900,
    fiber: 4,
    ingredients: JSON.stringify([
      { name: "Cooked rice (day-old)", quantity: 300, unit: "g" },
      { name: "Mixed vegetables (peas, carrots, corn)", quantity: 150, unit: "g" },
      { name: "Eggs", quantity: 1, unit: "large" },
      { name: "Soy sauce", quantity: 2, unit: "tbsp" },
      { name: "Sesame oil", quantity: 1, unit: "tsp" }
    ]),
    instructions: JSON.stringify([
      "Heat oil in a large wok or pan. Scramble egg and set aside.",
      "Add mixed vegetables and stir-fry until tender-crisp.",
      "Add cooked rice and break up any clumps. Stir-fry for a few minutes.",
      "Pour soy sauce and sesame oil over the rice. Add scrambled egg back and toss to combine.",
      "Serve hot."
    ]),
    tags: JSON.stringify(["chinese", "vegetarian", "rice_based", "quick"]),
    image_url: "https://example.com/vegetable-fried-rice.jpg",
    source_url: "https://example.com/vegetable-fried-rice-recipe"
  },
  {
    name: "Classic Tacos Al Pastor",
    description: "Marinated pork cooked on a vertical spit, thinly sliced and served in tortillas with pineapple.",
    cuisine: "mexican",
    prep_time: 60,
    cook_time: 120,
    servings: 4,
    calories: 550,
    protein: 35,
    carbs: 40,
    fat: 25,
    sugar: 8,
    sodium: 750,
    fiber: 6,
    ingredients: JSON.stringify([
      { name: "Pork shoulder", quantity: 600, unit: "g" },
      { name: "Achiote paste", quantity: 2, unit: "tbsp" },
      { name: "Pineapple", quantity: 1, unit: "small" },
      { name: "Corn tortillas", quantity: 12, unit: "pieces" },
      { name: "Cilantro", quantity: 0.5, unit: "bunch" },
      { name: "Onion", quantity: 0.5, unit: "medium" }
    ]),
    instructions: JSON.stringify([
      "Marinate thinly sliced pork with achiote paste, orange juice, and spices.",
      "Traditionally cook on a vertical spit, or pan-fry until caramelized.",
      "Warm tortillas. Dice pineapple, onion, and cilantro.",
      "Assemble tacos with pork, pineapple, onion, and cilantro."
    ]),
    tags: JSON.stringify(["mexican", "non_vegetarian", "spicy", "street_food"]),
    image_url: "https://example.com/tacos-al-pastor.jpg",
    source_url: "https://example.com/tacos-al-pastor-recipe"
  },
  {
    name: "Sushi Roll Platter (Assorted)",
    description: "A variety of sushi rolls, including California, Spicy Tuna, and Cucumber rolls.",
    cuisine: "japanese",
    prep_time: 45,
    cook_time: 15,
    servings: 2,
    calories: 400,
    protein: 20,
    carbs: 60,
    fat: 10,
    sugar: 8,
    sodium: 600,
    fiber: 5,
    ingredients: JSON.stringify([
      { name: "Sushi rice", quantity: 200, unit: "g" },
      { name: "Nori (seaweed sheets)", quantity: 4, unit: "sheets" },
      { name: "Tuna (sashimi-grade)", quantity: 100, unit: "g" },
      { name: "Avocado", quantity: 0.5, unit: "medium" },
      { name: "Cucumber", quantity: 0.5, unit: "medium" },
      { name: "Crab sticks", quantity: 4, unit: "pieces" },
      { name: "Soy sauce", quantity: 1, unit: "serving" },
      { name: "Wasabi", quantity: 1, unit: "serving" },
      { name: "Pickled ginger", quantity: 1, unit: "serving" }
    ]),
    instructions: JSON.stringify([
      "Prepare sushi rice according to instructions.",
      "Lay out a nori sheet, spread rice evenly, add fillings (tuna, avocado, cucumber, crab).",
      "Roll tightly using a bamboo mat. Slice into pieces.",
      "Serve with soy sauce, wasabi, and pickled ginger."
    ]),
    tags: JSON.stringify(["japanese", "fish_based", "raw_fish", "healthy"]),
    image_url: "https://example.com/sushi-platter.jpg",
    source_url: "https://example.com/sushi-recipe"
  },
  {
    name: "French Onion Soup",
    description: "A rich beef broth-based soup with caramelized onions, topped with a crouton and melted Gruyère cheese.",
    cuisine: "french",
    prep_time: 20,
    cook_time: 60,
    servings: 4,
    calories: 300,
    protein: 15,
    carbs: 25,
    fat: 18,
    sugar: 8,
    sodium: 1000,
    fiber: 3,
    ingredients: JSON.stringify([
      { name: "Onions (yellow or sweet)", quantity: 4, unit: "large" },
      { name: "Beef broth", quantity: 6, unit: "cups" },
      { name: "Dry white wine or sherry", quantity: 0.5, unit: "cup" },
      { name: "Baguette", quantity: 4, unit: "slices" },
      { name: "Gruyère cheese", quantity: 100, unit: "g" }
    ]),
    instructions: JSON.stringify([
      "Slice onions thinly and caramelize slowly in butter until deep golden brown.",
      "Deglaze pan with wine, then add beef broth. Simmer for 30 minutes.",
      "Toast baguette slices. Ladle soup into oven-safe bowls.",
      "Top with a baguette slice and grated Gruyère cheese. Broil until cheese is melted and bubbly."
    ]),
    tags: JSON.stringify(["french", "comfort_food", "rich_sauces", "cheese"]),
    image_url: "https://example.com/french-onion-soup.jpg",
    source_url: "https://example.com/french-onion-soup-recipe"
  },
  {
    name: "Thai Green Curry with Chicken",
    description: "A fragrant and spicy Thai curry made with green curry paste, coconut milk, chicken, and vegetables.",
    cuisine: "thai",
    prep_time: 20,
    cook_time: 30,
    servings: 3,
    calories: 500,
    protein: 30,
    carbs: 40,
    fat: 25,
    sugar: 10,
    sodium: 800,
    fiber: 6,
    ingredients: JSON.stringify([
      { name: "Chicken breast", quantity: 300, unit: "g" },
      { name: "Green curry paste", quantity: 3, unit: "tbsp" },
      { name: "Coconut milk", quantity: 400, unit: "ml" },
      { name: "Bamboo shoots", quantity: 100, unit: "g" },
      { name: "Thai basil leaves", quantity: 0.25, unit: "cup" },
      { name: "Fish sauce", quantity: 2, unit: "tbsp" },
      { name: "Palm sugar", quantity: 1, unit: "tsp" }
    ]),
    instructions: JSON.stringify([
      "Slice chicken and vegetables. In a pot, heat a little oil and fry green curry paste until fragrant.",
      "Add chicken and cook until lightly browned. Pour in coconut milk and bring to a simmer.",
      "Add bamboo shoots, fish sauce, and palm sugar. Cook until chicken is tender.",
      "Stir in Thai basil leaves just before serving. Serve with jasmine rice."
    ]),
    tags: JSON.stringify(["thai", "non_vegetarian", "spicy", "coconut_milk", "rich_curry"]),
    image_url: "https://example.com/thai-green-curry.jpg",
    source_url: "https://example.com/thai-green-curry-recipe"
  },
  {
    name: "Mediterranean Chicken Souvlaki with Tzatziki",
    description: "Grilled chicken skewers marinated in Mediterranean herbs, served with a cooling yogurt-cucumber sauce.",
    cuisine: "mediterranean",
    prep_time: 20,
    cook_time: 15,
    servings: 2,
    calories: 400,
    protein: 35,
    carbs: 20,
    fat: 20,
    sugar: 4,
    sodium: 500,
    fiber: 3,
    ingredients: JSON.stringify([
      { name: "Chicken breast", quantity: 300, unit: "g" },
      { name: "Lemon", quantity: 1, unit: "whole" },
      { name: "Olive oil", quantity: 3, unit: "tbsp" },
      { name: "Dried oregano", quantity: 1, unit: "tsp" },
      { name: "Greek yogurt", quantity: 150, unit: "g" },
      { name: "Cucumber", quantity: 0.5, unit: "medium" },
      { name: "Garlic", quantity: 1, unit: "clove" }
    ]),
    instructions: JSON.stringify([
      "Cut chicken into cubes and marinate with lemon juice, olive oil, oregano, salt, and pepper for 30 minutes.",
      "Thread chicken onto skewers. Grill until cooked through and slightly charred.",
      "For tzatziki: Grate cucumber, squeeze out excess water. Mix with Greek yogurt, minced garlic, and dill.",
      "Serve souvlaki with tzatziki and pita bread or a side salad."
    ]),
    tags: JSON.stringify(["mediterranean", "non_vegetarian", "grilled", "heart_healthy", "high_protein"]),
    image_url: "https://example.com/chicken-souvlaki.jpg",
    source_url: "https://example.com/chicken-souvlaki-recipe"
  },
  {
    name: "Classic American Cheeseburger",
    description: "A juicy beef patty topped with melted cheese, served in a bun with fresh toppings.",
    cuisine: "american",
    prep_time: 10,
    cook_time: 15,
    servings: 1,
    calories: 700,
    protein: 40,
    carbs: 40,
    fat: 45,
    sugar: 8,
    sodium: 900,
    fiber: 3,
    ingredients: JSON.stringify([
      { name: "Ground beef patty", quantity: 150, unit: "g" },
      { name: "Cheddar cheese slice", quantity: 1, unit: "slice" },
      { name: "Hamburger bun", quantity: 1, unit: "piece" },
      { name: "Lettuce", quantity: 1, unit: "leaf" },
      { name: "Tomato", quantity: 2, unit: "slices" },
      { name: "Onion", quantity: 2, unit: "slices" },
      { name: "Pickles", quantity: 3, unit: "slices" }
    ]),
    instructions: JSON.stringify([
      "Season beef patty with salt and pepper. Grill or pan-fry to desired doneness.",
      "Place cheese slice on patty during last minute of cooking to melt.",
      "Toast hamburger bun. Assemble burger with patty, cheese, lettuce, tomato, onion, and pickles.",
      "Serve with fries or a side salad."
    ]),
    tags: JSON.stringify(["american", "non_vegetarian", "comfort_food", "high_calorie"]),
    image_url: "https://example.com/cheeseburger.jpg",
    source_url: "https://example.com/cheeseburger-recipe"
  },
  {
    name: "Masala Dosa with Coconut Chutney",
    description: "A crispy South Indian crepe filled with spiced potato filling, served with coconut chutney.",
    cuisine: "indian",
    prep_time: 20,
    cook_time: 15,
    servings: 2,
    calories: 320,
    protein: 8,
    carbs: 45,
    fat: 12,
    sugar: 3,
    sodium: 400,
    fiber: 4,
    ingredients: JSON.stringify([
      { name: "Dosa batter", quantity: 200, unit: "ml" },
      { name: "Potatoes", quantity: 2, unit: "medium" },
      { name: "Onions", quantity: 1, unit: "medium" },
      { name: "Mustard seeds", quantity: 1, unit: "tsp" },
      { name: "Curry leaves", quantity: 10, unit: "leaves" },
      { name: "Turmeric powder", quantity: 0.5, unit: "tsp" },
      { name: "Coconut chutney", quantity: 50, unit: "g" }
    ]),
    instructions: JSON.stringify([
      "Prepare potato filling by sautéing onions, mustard seeds, curry leaves, and turmeric.",
      "Add boiled and mashed potatoes, season with salt and pepper.",
      "Heat dosa tawa and pour batter in circular motion to make thin crepe.",
      "Add potato filling, fold dosa, and serve with coconut chutney."
    ]),
    tags: JSON.stringify(["indian", "vegetarian", "breakfast", "spicy", "gluten_free", "indian_cuisine"]),
    image_url: "https://example.com/masala-dosa.jpg",
    source_url: "https://example.com/masala-dosa-recipe"
  },
  {
    name: "Dal Khichdi with Raita",
    description: "A comforting one-pot meal of rice and lentils cooked with aromatic spices.",
    cuisine: "indian",
    prep_time: 15,
    cook_time: 30,
    servings: 3,
    calories: 360,
    protein: 16,
    carbs: 52,
    fat: 8,
    sugar: 2,
    sodium: 300,
    fiber: 6,
    ingredients: JSON.stringify([
      { name: "Basmati rice", quantity: 150, unit: "g" },
      { name: "Yellow moong dal", quantity: 100, unit: "g" },
      { name: "Ghee", quantity: 2, unit: "tbsp" },
      { name: "Cumin seeds", quantity: 1, unit: "tsp" },
      { name: "Turmeric powder", quantity: 1, unit: "tsp" },
      { name: "Ginger", quantity: 1, unit: "inch" },
      { name: "Yogurt", quantity: 100, unit: "g" }
    ]),
    instructions: JSON.stringify([
      "Wash rice and dal together. Heat ghee in pressure cooker.",
      "Add cumin seeds, ginger, and turmeric. Add rice-dal mixture.",
      "Add water and pressure cook for 2 whistles. Let it rest.",
      "Serve hot with raita and pickle."
    ]),
    tags: JSON.stringify(["indian", "vegetarian", "lunch", "comfort_food", "gluten_free", "indian_cuisine", "protein_rich"]),
    image_url: "https://example.com/dal-khichdi.jpg",
    source_url: "https://example.com/dal-khichdi-recipe"
  },
  {
    name: "Palak Paneer with Jeera Rice",
    description: "Fresh spinach curry with homemade cottage cheese, served with cumin-flavored rice.",
    cuisine: "indian",
    prep_time: 25,
    cook_time: 20,
    servings: 2,
    calories: 420,
    protein: 22,
    carbs: 48,
    fat: 16,
    sugar: 4,
    sodium: 450,
    fiber: 5,
    ingredients: JSON.stringify([
      { name: "Spinach", quantity: 200, unit: "g" },
      { name: "Paneer", quantity: 150, unit: "g" },
      { name: "Onions", quantity: 1, unit: "medium" },
      { name: "Tomatoes", quantity: 2, unit: "medium" },
      { name: "Ginger-garlic paste", quantity: 1, unit: "tbsp" },
      { name: "Garam masala", quantity: 1, unit: "tsp" },
      { name: "Basmati rice", quantity: 100, unit: "g" },
      { name: "Cumin seeds", quantity: 1, unit: "tsp" }
    ]),
    instructions: JSON.stringify([
      "Blanch spinach and blend to smooth paste. Sauté onions and ginger-garlic paste.",
      "Add tomatoes and spices, cook until oil separates. Add spinach paste.",
      "Add paneer cubes and simmer. Prepare jeera rice separately.",
      "Serve palak paneer with jeera rice."
    ]),
    tags: JSON.stringify(["indian", "vegetarian", "dinner", "iron_rich", "balanced", "indian_cuisine"]),
    image_url: "https://example.com/palak-paneer.jpg",
    source_url: "https://example.com/palak-paneer-recipe"
  },
  {
    name: "Murmura Chivda",
    description: "A crunchy Indian snack made with puffed rice, nuts, and aromatic spices.",
    cuisine: "indian",
    prep_time: 10,
    cook_time: 15,
    servings: 4,
    calories: 160,
    protein: 4,
    carbs: 22,
    fat: 8,
    sugar: 2,
    sodium: 200,
    fiber: 2,
    ingredients: JSON.stringify([
      { name: "Puffed rice", quantity: 200, unit: "g" },
      { name: "Peanuts", quantity: 50, unit: "g" },
      { name: "Cashews", quantity: 30, unit: "g" },
      { name: "Curry leaves", quantity: 10, unit: "leaves" },
      { name: "Mustard seeds", quantity: 1, unit: "tsp" },
      { name: "Turmeric powder", quantity: 0.5, unit: "tsp" },
      { name: "Oil", quantity: 2, unit: "tbsp" }
    ]),
    instructions: JSON.stringify([
      "Heat oil in a pan. Add mustard seeds and curry leaves.",
      "Add peanuts and cashews, roast until golden. Add turmeric and salt.",
      "Add puffed rice and mix well. Cook for 2-3 minutes.",
      "Let it cool completely before storing."
    ]),
    tags: JSON.stringify(["indian", "vegetarian", "snack", "crunchy", "indian_cuisine"]),
    image_url: "https://example.com/murmura-chivda.jpg",
    source_url: "https://example.com/murmura-chivda-recipe"
  },
  {
    name: "Spanish Paella Valenciana",
    description: "A traditional Spanish rice dish with saffron, chicken, rabbit, and green beans.",
    cuisine: "spanish",
    prep_time: 30,
    cook_time: 40,
    servings: 4,
    calories: 650,
    protein: 40,
    carbs: 60,
    fat: 25,
    sugar: 5,
    sodium: 850,
    fiber: 7,
    ingredients: JSON.stringify([
      { name: "Arborio or Bomba rice", quantity: 300, unit: "g" },
      { name: "Chicken thighs", quantity: 2, unit: "pieces" },
      { name: "Rabbit meat (optional)", quantity: 200, unit: "g" },
      { name: "Green beans", quantity: 100, unit: "g" },
      { name: "Tomato puree", quantity: 50, unit: "ml" },
      { name: "Saffron threads", quantity: 0.5, unit: "tsp" },
      { name: "Chicken broth", quantity: 700, unit: "ml" },
      { name: "Olive oil", quantity: 3, unit: "tbsp" }
    ]),
    instructions: JSON.stringify([
      "In a paella pan, brown chicken and rabbit. Add green beans and tomato puree, cook for a few minutes.",
      "Stir in rice and saffron. Pour in hot chicken broth. Bring to a simmer.",
      "Cook undisturbed until liquid is absorbed and rice is tender, forming a crust (socarrat) on the bottom.",
      "Garnish with lemon wedges and serve directly from the pan."
    ]),
    tags: JSON.stringify(["spanish", "non_vegetarian", "rice_based", "saffron_infused"]),
    image_url: "https://example.com/paella.jpg",
    source_url: "https://example.com/paella-recipe"
  }
];

async function seedRecipes(runQuery) {
  for (const recipe of recipesData) {
    try {
      const existingRecipe = await runQuery(
        `SELECT id FROM recipes WHERE name = ?`,
        [recipe.name]
      );
      if (!existingRecipe) {
        await runQuery(
          `INSERT INTO recipes (
            name, description, cuisine, prep_time, cook_time, servings, 
            calories, protein, carbs, fat, sugar, sodium, fiber, 
            ingredients, instructions, tags, image_url, source_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recipe.name, recipe.description, recipe.cuisine, recipe.prep_time, recipe.cook_time, recipe.servings,
            recipe.calories, recipe.protein, recipe.carbs, recipe.fat, recipe.sugar, recipe.sodium, recipe.fiber,
            recipe.ingredients, recipe.instructions, recipe.tags, recipe.image_url, recipe.source_url
          ]
        );
        console.log(`Inserted recipe: ${recipe.name}`);
      } else {
        console.log(`Recipe already exists: ${recipe.name}`);
      }
    } catch (error) {
      console.error(`Error seeding recipe ${recipe.name}:`, error);
    }
  }
  console.log("Recipe seeding complete.");
}

module.exports = { seedRecipes, recipesData }; 