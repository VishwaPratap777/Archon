// simple_test.js
const assert = require('assert');

console.log("Running Archon Sample Tests...");

// A mock function simulating cyclomatic complexity calculation metrics
function calculateAverageComplexity(files) {
    if (!files || files.length === 0) return 0;
    const total = files.reduce((acc, file) => acc + file.complexity, 0);
    return total / files.length;
}

try {
    // Test 1: Standard complexity calculation
    assert.strictEqual(calculateAverageComplexity([{ complexity: 10 }, { complexity: 20 }]), 15);
    console.log("✅ Test 1 passed: Calculates average complexity correctly.");

    // Test 2: Empty array handling
    assert.strictEqual(calculateAverageComplexity([]), 0);
    console.log("✅ Test 2 passed: Handles empty array.");

    // Test 3: Null handling
    assert.strictEqual(calculateAverageComplexity(null), 0);
    console.log("✅ Test 3 passed: Handles null inputs.");

    console.log("\nAll tests passed successfully.");
} catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
}
