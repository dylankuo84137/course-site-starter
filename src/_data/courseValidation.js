/**
 * Course Validation Data
 * Runs validation during Eleventy build and exposes results as global data
 */

const validator = require('./course-validator.js');
const path = require('path');

module.exports = function() {
  // Run validation on all course files
  const dataDir = path.join(__dirname);
  const results = validator.validateAllCourses(dataDir);
  
  // Log results during build
  console.log('\n' + validator.formatValidationResults(results));
  
  // Fail build if validation errors exist (but allow warnings)
  if (!results.overall.isValid) {
    throw new Error(`Course validation failed with ${results.overall.errorCount} errors. Please fix before building.`);
  }
  
  // Return validation results as global data for templates
  return {
    isValid: results.overall.isValid,
    errorCount: results.overall.errorCount,
    warningCount: results.overall.warningCount,
    courseCount: results.overall.courseCount,
    lastValidated: new Date().toISOString(),
    
    // Include detailed results for development
    details: process.env.NODE_ENV === 'development' ? results : null
  };
};