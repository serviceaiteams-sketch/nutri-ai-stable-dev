const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getRow, getAll } = require('../config/database');

// Enhanced DNA/Genomic Integration for Ultra-Personalized Nutrition

// Upload and process genomic data
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { genomicData, dataSource, consentGiven } = req.body;

    if (!consentGiven) {
      return res.status(400).json({ 
        error: 'User consent required for genomic data processing' 
      });
    }

    // Validate and process genomic data
    const processedData = await processGenomicData(genomicData, dataSource);
    
    // Extract key genetic variants
    const keyVariants = extractKeyNutritionVariants(processedData);
    
    // Generate personalized nutrition insights
    const nutritionInsights = await generateGenomicNutritionInsights(userId, keyVariants);
    
    // Store genomic data securely
    const genomicId = await runQuery(
      `INSERT INTO user_genomic_data (
        user_id, raw_data, processed_data, key_variants, 
        data_source, consent_given, privacy_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(genomicData),
        JSON.stringify(processedData),
        JSON.stringify(keyVariants),
        dataSource,
        consentGiven,
        'high' // default to highest privacy
      ]
    );

    // Create initial genomic nutrition profile
    await createGenomicNutritionProfile(userId, keyVariants, nutritionInsights);

    res.json({
      success: true,
      genomicId: genomicId.lastID,
      nutritionInsights,
      keyVariants: keyVariants.length,
      message: 'Genomic data processed and nutrition profile created'
    });

  } catch (error) {
    console.error('Error processing genomic data:', error);
    res.status(500).json({ error: 'Failed to process genomic data' });
  }
});

// Get personalized nutrition recommendations based on genetics
router.get('/nutrition-recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's genomic nutrition profile
    const genomicProfile = await getRow(
      'SELECT * FROM genomic_nutrition_profiles WHERE user_id = ?',
      [userId]
    );

    if (!genomicProfile) {
      return res.status(404).json({ 
        error: 'No genomic nutrition profile found. Please upload genomic data first.' 
      });
    }

    // Get current nutrition data for comparison
    const currentNutrition = await getCurrentNutritionProfile(userId);
    
    // Generate personalized recommendations
    const recommendations = await generatePersonalizedGenomicRecommendations(
      genomicProfile, 
      currentNutrition
    );

    // Get supplement recommendations
    const supplementRecommendations = await getGenomicSupplementRecommendations(
      genomicProfile
    );

    // Calculate genetic nutrition score
    const nutritionScore = calculateGeneticNutritionScore(genomicProfile, currentNutrition);

    res.json({
      recommendations,
      supplementRecommendations,
      nutritionScore,
      geneticFactors: JSON.parse(genomicProfile.genetic_factors),
      riskAssessment: JSON.parse(genomicProfile.risk_assessment),
      lastUpdated: genomicProfile.updated_at
    });

  } catch (error) {
    console.error('Error generating genomic nutrition recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get genetic predispositions and health risks
router.get('/health-predispositions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const genomicData = await getRow(
      'SELECT * FROM user_genomic_data WHERE user_id = ?',
      [userId]
    );

    if (!genomicData) {
      return res.status(404).json({ 
        error: 'No genomic data found' 
      });
    }

    const keyVariants = JSON.parse(genomicData.key_variants);
    
    // Analyze health predispositions
    const healthPredispositions = analyzeHealthPredispositions(keyVariants);
    
    // Get nutrition-related genetic factors
    const nutritionFactors = analyzeNutritionGenetics(keyVariants);
    
    // Generate preventive recommendations
    const preventiveRecommendations = generatePreventiveRecommendations(
      healthPredispositions, 
      nutritionFactors
    );

    res.json({
      healthPredispositions,
      nutritionFactors,
      preventiveRecommendations,
      disclaimer: 'This information is for educational purposes only and should not replace professional medical advice.'
    });

  } catch (error) {
    console.error('Error analyzing health predispositions:', error);
    res.status(500).json({ error: 'Failed to analyze health predispositions' });
  }
});

// Get nutrient metabolism analysis
router.get('/nutrient-metabolism', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const genomicProfile = await getRow(
      'SELECT * FROM genomic_nutrition_profiles WHERE user_id = ?',
      [userId]
    );

    if (!genomicProfile) {
      return res.status(404).json({ 
        error: 'No genomic nutrition profile found' 
      });
    }

    const metabolismProfile = JSON.parse(genomicProfile.metabolism_profile);
    
    // Analyze specific nutrient metabolism
    const vitaminMetabolism = analyzeVitaminMetabolism(metabolismProfile);
    const mineralMetabolism = analyzeMineralMetabolism(metabolismProfile);
    const macronutrientMetabolism = analyzeMacronutrientMetabolism(metabolismProfile);
    
    // Generate personalized dosage recommendations
    const dosageRecommendations = generatePersonalizedDosages(
      vitaminMetabolism,
      mineralMetabolism
    );

    res.json({
      vitaminMetabolism,
      mineralMetabolism,
      macronutrientMetabolism,
      dosageRecommendations,
      metabolismScore: calculateMetabolismScore(metabolismProfile)
    });

  } catch (error) {
    console.error('Error analyzing nutrient metabolism:', error);
    res.status(500).json({ error: 'Failed to analyze nutrient metabolism' });
  }
});

// Update genomic privacy settings
router.put('/privacy-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { privacyLevel, shareForResearch, anonymizeData } = req.body;

    await runQuery(
      `UPDATE user_genomic_data 
       SET privacy_level = ?, share_for_research = ?, anonymize_data = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [privacyLevel, shareForResearch, anonymizeData, userId]
    );

    res.json({
      success: true,
      message: 'Privacy settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// Delete genomic data (GDPR compliance)
router.delete('/data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmDeletion } = req.body;

    if (!confirmDeletion) {
      return res.status(400).json({ 
        error: 'Confirmation required for data deletion' 
      });
    }

    // Delete all genomic-related data
    await runQuery('DELETE FROM user_genomic_data WHERE user_id = ?', [userId]);
    await runQuery('DELETE FROM genomic_nutrition_profiles WHERE user_id = ?', [userId]);
    await runQuery('DELETE FROM genetic_test_results WHERE user_id = ?', [userId]);

    res.json({
      success: true,
      message: 'All genomic data has been permanently deleted'
    });

  } catch (error) {
    console.error('Error deleting genomic data:', error);
    res.status(500).json({ error: 'Failed to delete genomic data' });
  }
});

// Helper Functions

async function processGenomicData(rawData, dataSource) {
  // Process different genomic data formats (23andMe, AncestryDNA, etc.)
  const processed = {
    dataSource,
    totalVariants: 0,
    qualityScore: 0,
    coverage: {},
    processedAt: new Date().toISOString()
  };

  switch (dataSource) {
    case '23andme':
      processed = process23andMeData(rawData);
      break;
    case 'ancestrydna':
      processed = processAncestryData(rawData);
      break;
    case 'vcf':
      processed = processVCFData(rawData);
      break;
    default:
      processed = processGenericData(rawData);
  }

  return processed;
}

function extractKeyNutritionVariants(processedData) {
  // Key genetic variants related to nutrition and metabolism
  const keyVariants = [];
  
  const nutritionRelatedGenes = {
    // Vitamin metabolism
    'MTHFR': ['rs1801133', 'rs1801131'], // Folate metabolism
    'FUT2': ['rs602662'], // B12 absorption
    'GC': ['rs2282679', 'rs4588'], // Vitamin D binding
    'CYP2R1': ['rs10741657'], // Vitamin D metabolism
    
    // Mineral metabolism
    'HFE': ['rs1799945', 'rs1800562'], // Iron metabolism
    'ATP7B': ['rs1061472'], // Copper metabolism
    
    // Caffeine metabolism
    'CYP1A2': ['rs762551'], // Caffeine metabolism
    
    // Alcohol metabolism
    'ADH1B': ['rs1229984'], // Alcohol metabolism
    'ALDH2': ['rs671'], // Acetaldehyde metabolism
    
    // Lactose tolerance
    'LCT': ['rs4988235'], // Lactase persistence
    
    // Omega-3 metabolism
    'FADS1': ['rs174550'], // Fatty acid desaturase
    'FADS2': ['rs174575'], // Fatty acid desaturase
  };

  // Extract variants for each gene
  Object.entries(nutritionRelatedGenes).forEach(([gene, snps]) => {
    snps.forEach(snp => {
      const variant = findVariantInData(processedData, snp);
      if (variant) {
        keyVariants.push({
          gene,
          snp,
          genotype: variant.genotype,
          impact: assessVariantImpact(gene, snp, variant.genotype),
          confidence: variant.confidence || 'high'
        });
      }
    });
  });

  return keyVariants;
}

async function generateGenomicNutritionInsights(userId, keyVariants) {
  const insights = {
    vitaminMetabolism: {},
    mineralMetabolism: {},
    dietaryRecommendations: [],
    riskFactors: [],
    strengths: []
  };

  keyVariants.forEach(variant => {
    const impact = variant.impact;
    
    switch (variant.gene) {
      case 'MTHFR':
        insights.vitaminMetabolism.folate = analyzeMTHFRVariant(variant);
        break;
      case 'FUT2':
        insights.vitaminMetabolism.b12 = analyzeFUT2Variant(variant);
        break;
      case 'GC':
      case 'CYP2R1':
        insights.vitaminMetabolism.vitaminD = analyzeVitaminDVariant(variant);
        break;
      case 'HFE':
        insights.mineralMetabolism.iron = analyzeIronVariant(variant);
        break;
      case 'CYP1A2':
        insights.dietaryRecommendations.push(analyzeCaffeineMetabolism(variant));
        break;
      case 'LCT':
        insights.dietaryRecommendations.push(analyzeLactoseTolerance(variant));
        break;
      case 'FADS1':
      case 'FADS2':
        insights.dietaryRecommendations.push(analyzeOmega3Metabolism(variant));
        break;
    }
  });

  return insights;
}

async function createGenomicNutritionProfile(userId, keyVariants, insights) {
  const geneticFactors = extractGeneticFactors(keyVariants);
  const riskAssessment = assessNutritionalRisks(keyVariants);
  const metabolismProfile = createMetabolismProfile(keyVariants);

  await runQuery(
    `INSERT INTO genomic_nutrition_profiles (
      user_id, genetic_factors, risk_assessment, metabolism_profile,
      vitamin_recommendations, mineral_recommendations, dietary_modifications
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      JSON.stringify(geneticFactors),
      JSON.stringify(riskAssessment),
      JSON.stringify(metabolismProfile),
      JSON.stringify(insights.vitaminMetabolism),
      JSON.stringify(insights.mineralMetabolism),
      JSON.stringify(insights.dietaryRecommendations)
    ]
  );
}

async function getCurrentNutritionProfile(userId) {
  // Get recent nutrition data
  const recentNutrition = await getRow(
    `SELECT 
      AVG(total_calories) as avg_calories,
      AVG(total_protein) as avg_protein,
      AVG(total_carbs) as avg_carbs,
      AVG(total_fat) as avg_fat,
      AVG(total_fiber) as avg_fiber,
      AVG(total_sugar) as avg_sugar,
      AVG(total_sodium) as avg_sodium
    FROM meals 
    WHERE user_id = ? AND created_at >= datetime('now', '-30 days')`,
    [userId]
  );

  // Get micronutrient data
  const micronutrients = await getRow(
    `SELECT 
      AVG(vitamin_c) as avg_vitamin_c,
      AVG(vitamin_d) as avg_vitamin_d,
      AVG(folate_b9) as avg_folate,
      AVG(cobalamin_b12) as avg_b12,
      AVG(iron) as avg_iron,
      AVG(calcium) as avg_calcium
    FROM micronutrient_tracking 
    WHERE user_id = ? AND date >= date('now', '-30 days')`,
    [userId]
  );

  return {
    macronutrients: recentNutrition,
    micronutrients: micronutrients
  };
}

// Genetic analysis functions
function analyzeMTHFRVariant(variant) {
  const recommendations = {
    supplement: 'methylfolate',
    dosage: 'standard',
    foodSources: ['leafy greens', 'legumes', 'fortified grains'],
    notes: ''
  };

  if (variant.genotype === 'TT' && variant.snp === 'rs1801133') {
    recommendations.dosage = 'high';
    recommendations.supplement = 'methylfolate (avoid folic acid)';
    recommendations.notes = 'Reduced MTHFR enzyme activity - requires methylated folate';
  }

  return recommendations;
}

function analyzeFUT2Variant(variant) {
  const recommendations = {
    supplement: 'B12',
    dosage: 'standard',
    form: 'cyanocobalamin',
    monitoring: 'annual'
  };

  if (variant.genotype === 'AA') {
    recommendations.dosage = 'high';
    recommendations.form = 'methylcobalamin or hydroxocobalamin';
    recommendations.monitoring = 'bi-annual';
    recommendations.notes = 'Reduced B12 absorption - consider sublingual or injection';
  }

  return recommendations;
}

function analyzeVitaminDVariant(variant) {
  const recommendations = {
    supplement: 'Vitamin D3',
    dosage: 'standard',
    testing: 'annual',
    sunExposure: 'moderate'
  };

  if ((variant.gene === 'GC' && ['TT', 'GT'].includes(variant.genotype)) ||
      (variant.gene === 'CYP2R1' && variant.genotype === 'AA')) {
    recommendations.dosage = 'high';
    recommendations.testing = 'bi-annual';
    recommendations.notes = 'Reduced vitamin D metabolism - higher supplementation needed';
  }

  return recommendations;
}

function analyzeIronVariant(variant) {
  const recommendations = {
    monitoring: 'standard',
    supplements: 'as needed',
    dietaryIron: 'heme sources preferred'
  };

  if (variant.genotype === 'CC' && variant.snp === 'rs1800562') {
    recommendations.monitoring = 'frequent';
    recommendations.supplements = 'avoid unless deficient';
    recommendations.notes = 'Increased iron absorption - monitor for overload';
  }

  return recommendations;
}

function analyzeCaffeineMetabolism(variant) {
  if (variant.genotype === 'AA') {
    return {
      type: 'caffeine',
      recommendation: 'Slow caffeine metabolizer - limit to 1-2 cups coffee daily',
      timing: 'Avoid caffeine after 2 PM',
      alternatives: 'Green tea, herbal teas'
    };
  }
  
  return {
    type: 'caffeine',
    recommendation: 'Normal caffeine metabolism - up to 3-4 cups daily is fine',
    timing: 'Avoid within 6 hours of bedtime'
  };
}

function analyzeLactoseTolerance(variant) {
  if (variant.genotype === 'CC') {
    return {
      type: 'lactose',
      recommendation: 'Lactose intolerant - avoid dairy or use lactase supplements',
      alternatives: 'Plant-based milk, lactose-free dairy products',
      calcium: 'Ensure adequate calcium from non-dairy sources'
    };
  }
  
  return {
    type: 'lactose',
    recommendation: 'Lactose tolerant - dairy products are well tolerated'
  };
}

function analyzeOmega3Metabolism(variant) {
  if (variant.genotype === 'TT' || variant.genotype === 'CT') {
    return {
      type: 'omega3',
      recommendation: 'Reduced omega-3 conversion - increase EPA/DHA intake',
      sources: 'Fatty fish, algae oil supplements',
      frequency: '2-3 times per week'
    };
  }
  
  return {
    type: 'omega3',
    recommendation: 'Normal omega-3 metabolism - plant sources adequate'
  };
}

// Additional helper functions
function findVariantInData(processedData, snp) {
  // Mock implementation - would search through actual genomic data
  return {
    genotype: 'CT', // example genotype
    confidence: 'high'
  };
}

function assessVariantImpact(gene, snp, genotype) {
  // Assess the functional impact of genetic variants
  return 'moderate'; // example impact
}

function extractGeneticFactors(keyVariants) {
  return keyVariants.map(v => ({
    gene: v.gene,
    impact: v.impact,
    category: getGeneCategory(v.gene)
  }));
}

function assessNutritionalRisks(keyVariants) {
  const risks = [];
  
  keyVariants.forEach(variant => {
    if (variant.impact === 'high') {
      risks.push({
        type: 'deficiency_risk',
        nutrient: getNutrientFromGene(variant.gene),
        severity: 'moderate',
        recommendation: `Monitor ${getNutrientFromGene(variant.gene)} levels closely`
      });
    }
  });
  
  return risks;
}

function createMetabolismProfile(keyVariants) {
  return {
    vitaminMetabolism: 'normal',
    mineralAbsorption: 'normal',
    detoxification: 'normal',
    energyMetabolism: 'normal'
  };
}

function getGeneCategory(gene) {
  const categories = {
    'MTHFR': 'vitamin_metabolism',
    'FUT2': 'vitamin_absorption',
    'GC': 'vitamin_transport',
    'HFE': 'mineral_metabolism',
    'CYP1A2': 'detoxification',
    'LCT': 'carbohydrate_metabolism'
  };
  
  return categories[gene] || 'other';
}

function getNutrientFromGene(gene) {
  const nutrients = {
    'MTHFR': 'folate',
    'FUT2': 'vitamin_b12',
    'GC': 'vitamin_d',
    'HFE': 'iron',
    'LCT': 'lactose'
  };
  
  return nutrients[gene] || 'unknown';
}

// Additional analysis functions for the API endpoints
async function generatePersonalizedGenomicRecommendations(genomicProfile, currentNutrition) {
  const recommendations = [];
  
  const geneticFactors = JSON.parse(genomicProfile.genetic_factors);
  const vitaminRecs = JSON.parse(genomicProfile.vitamin_recommendations);
  
  Object.entries(vitaminRecs).forEach(([vitamin, rec]) => {
    if (rec.dosage === 'high') {
      recommendations.push({
        type: 'supplement',
        nutrient: vitamin,
        dosage: rec.dosage,
        form: rec.supplement,
        priority: 'high',
        reasoning: 'Genetic variant affects metabolism'
      });
    }
  });
  
  return recommendations;
}

async function getGenomicSupplementRecommendations(genomicProfile) {
  const supplements = [];
  
  const vitaminRecs = JSON.parse(genomicProfile.vitamin_recommendations);
  const mineralRecs = JSON.parse(genomicProfile.mineral_recommendations);
  
  // Process vitamin recommendations
  Object.entries(vitaminRecs).forEach(([vitamin, rec]) => {
    if (rec.supplement) {
      supplements.push({
        name: rec.supplement,
        dosage: rec.dosage,
        frequency: 'daily',
        timing: 'with_meals',
        geneticReason: `${vitamin} metabolism variant`
      });
    }
  });
  
  return supplements;
}

function calculateGeneticNutritionScore(genomicProfile, currentNutrition) {
  let score = 100;
  
  // Deduct points for genetic risk factors
  const riskFactors = JSON.parse(genomicProfile.risk_assessment);
  score -= riskFactors.length * 10;
  
  // Add points for good nutrition alignment
  const geneticFactors = JSON.parse(genomicProfile.genetic_factors);
  // Implementation would check if current nutrition aligns with genetic needs
  
  return Math.max(0, Math.min(100, score));
}

function analyzeHealthPredispositions(keyVariants) {
  const predispositions = [];
  
  keyVariants.forEach(variant => {
    switch (variant.gene) {
      case 'MTHFR':
        if (variant.genotype === 'TT') {
          predispositions.push({
            condition: 'Cardiovascular disease',
            risk: 'moderate',
            prevention: 'Adequate folate intake, B-vitamin supplementation'
          });
        }
        break;
      case 'HFE':
        if (variant.genotype === 'CC') {
          predispositions.push({
            condition: 'Iron overload',
            risk: 'moderate',
            prevention: 'Regular iron monitoring, avoid iron supplements'
          });
        }
        break;
    }
  });
  
  return predispositions;
}

function analyzeNutritionGenetics(keyVariants) {
  const factors = {};
  
  keyVariants.forEach(variant => {
    factors[variant.gene] = {
      impact: variant.impact,
      recommendation: getGeneRecommendation(variant.gene, variant.genotype)
    };
  });
  
  return factors;
}

function generatePreventiveRecommendations(predispositions, nutritionFactors) {
  const recommendations = [];
  
  predispositions.forEach(pred => {
    recommendations.push({
      category: 'prevention',
      condition: pred.condition,
      action: pred.prevention,
      priority: pred.risk
    });
  });
  
  return recommendations;
}

function analyzeVitaminMetabolism(metabolismProfile) {
  return {
    folate: metabolismProfile.folate || 'normal',
    b12: metabolismProfile.b12 || 'normal',
    vitaminD: metabolismProfile.vitaminD || 'normal',
    overall: 'normal'
  };
}

function analyzeMineralMetabolism(metabolismProfile) {
  return {
    iron: metabolismProfile.iron || 'normal',
    calcium: metabolismProfile.calcium || 'normal',
    zinc: metabolismProfile.zinc || 'normal',
    overall: 'normal'
  };
}

function analyzeMacronutrientMetabolism(metabolismProfile) {
  return {
    carbohydrates: metabolismProfile.carbs || 'normal',
    fats: metabolismProfile.fats || 'normal',
    proteins: metabolismProfile.proteins || 'normal',
    overall: 'normal'
  };
}

function generatePersonalizedDosages(vitaminMetabolism, mineralMetabolism) {
  const dosages = [];
  
  Object.entries(vitaminMetabolism).forEach(([vitamin, status]) => {
    if (status === 'impaired') {
      dosages.push({
        nutrient: vitamin,
        standardDose: getStandardDose(vitamin),
        personalizedDose: getPersonalizedDose(vitamin, status),
        reason: 'Genetic variant affects metabolism'
      });
    }
  });
  
  return dosages;
}

function calculateMetabolismScore(metabolismProfile) {
  // Calculate overall metabolism efficiency score
  return 85; // Example score
}

function getGeneRecommendation(gene, genotype) {
  // Return specific recommendations based on gene and genotype
  return `Personalized recommendation for ${gene} variant`;
}

function getStandardDose(nutrient) {
  const doses = {
    'folate': '400mcg',
    'b12': '2.4mcg',
    'vitaminD': '600IU'
  };
  return doses[nutrient] || 'standard';
}

function getPersonalizedDose(nutrient, status) {
  const doses = {
    'folate': '800mcg',
    'b12': '100mcg',
    'vitaminD': '2000IU'
  };
  return doses[nutrient] || 'standard';
}

// Mock data processing functions (would be replaced with real implementations)
function process23andMeData(rawData) {
  return { dataSource: '23andme', totalVariants: 500000, qualityScore: 95 };
}

function processAncestryData(rawData) {
  return { dataSource: 'ancestrydna', totalVariants: 700000, qualityScore: 93 };
}

function processVCFData(rawData) {
  return { dataSource: 'vcf', totalVariants: 5000000, qualityScore: 98 };
}

function processGenericData(rawData) {
  return { dataSource: 'generic', totalVariants: 100000, qualityScore: 80 };
}

module.exports = router; 