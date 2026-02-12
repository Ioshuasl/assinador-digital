import YAML from 'yamljs';
import path from 'path';

// Carrega o arquivo YAML da pasta docs
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));

export { swaggerDocument };