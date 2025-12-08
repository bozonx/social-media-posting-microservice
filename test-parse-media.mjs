import * as yaml from 'js-yaml';

// Test parseMediaField logic
function parseUniversalField(value, fieldName) {
    if (!value) return {};

    if (typeof value === 'string') {
        // Try YAML first
        try {
            const yamlResult = yaml.load(value);
            if (typeof yamlResult === 'object' && yamlResult !== null) {
                return yamlResult;
            }
        } catch {
            // YAML parsing failed, try JSON
        }

        // Try JSON
        try {
            const jsonResult = JSON.parse(value);
            if (typeof jsonResult === 'object' && jsonResult !== null) {
                return jsonResult;
            }
        } catch {
            throw new Error(`${fieldName} must be valid JSON or YAML`);
        }

        throw new Error(`${fieldName} must be an object or array`);
    }

    // If value is any other type, convert to JSON
    try {
        const stringified = JSON.stringify(value);
        const parsed = JSON.parse(stringified);
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
        }
        throw new Error(`${fieldName} must be an object or array`);
    } catch {
        throw new Error(`${fieldName} could not be converted to JSON`);
    }
}

function parseMediaField(value) {
    if (!value) return undefined;

    // If it's a string that doesn't look like JSON/YAML, wrap it
    // Check for JSON array/object or YAML array (starts with -)
    if (typeof value === 'string') {
        const trimmed = value.trim();
        // If it looks like JSON or YAML structure, parse it
        if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('-')) {
            return parseUniversalField(value, 'Media');
        }
        // Otherwise it's a plain URL or file_id, wrap it
        return { src: value };
    }

    // Otherwise use universal parser
    return parseUniversalField(value, 'Media');
}

// Test cases
const yamlString = `- src: "https://images.pexels.com/photos/241316/pexels-photo-241316.jpeg"
  type: "image"
- src: "https://images.pexels.com/photos/31256342/pexels-photo-31256342.jpeg"
  type: "image"`;

console.log('Test 1: YAML array');
console.log('Input:', yamlString);
const result1 = parseMediaField(yamlString);
console.log('Result:', JSON.stringify(result1, null, 2));
console.log('Is Array:', Array.isArray(result1));
console.log('');

console.log('Test 2: Plain URL');
const result2 = parseMediaField('https://example.com/image.jpg');
console.log('Result:', JSON.stringify(result2, null, 2));
console.log('');

console.log('Test 3: JSON array');
const jsonString = '[{"src": "https://example.com/1.jpg"}, {"src": "https://example.com/2.jpg"}]';
const result3 = parseMediaField(jsonString);
console.log('Result:', JSON.stringify(result3, null, 2));
console.log('Is Array:', Array.isArray(result3));
