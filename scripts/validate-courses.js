#!/usr/bin/env node

/**
 * Course Data Validation Script
 * Standalone script to validate all course JSON files
 */

const path = require('path');
const process = require('process');

// Import validator from _data directory
const validator = require('../src/_data/course-validator.js');

function main() {
  console.log('🔍 Validating course data...\n');

  const dataDir = path.join(__dirname, '..', 'src', '_data');
  const results = validator.validateAllCourses(dataDir);
  
  // Output formatted results
  console.log(validator.formatValidationResults(results));
  
  // Exit with appropriate code
  if (!results.overall.isValid) {
    console.error('❌ Validation failed. Please fix errors before proceeding.');
    process.exit(1);
  } else {
    console.log('✅ All course data is valid!');
    process.exit(0);
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  main();
}

module.exports = { main };