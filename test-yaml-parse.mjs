import * as yaml from 'js-yaml';

const yamlString = `- src: "https://images.pexels.com/photos/241316/pexels-photo-241316.jpeg"
  type: "image"
- src: "https://images.pexels.com/photos/31256342/pexels-photo-31256342.jpeg"
  type: "image"`;

console.log('YAML input:');
console.log(yamlString);
console.log('\n---\n');

try {
    const result = yaml.load(yamlString);
    console.log('Parsed result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n---\n');
    console.log('Type:', typeof result);
    console.log('Is Array:', Array.isArray(result));
} catch (error) {
    console.error('Parse error:', error);
}
