import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'public', 'data', 'watches.json');

const requiredTopLevelFields = ['schemaVersion', 'updatedAt', 'currency', 'inquiryEmail', 'watches'];
const requiredWatchFields = [
  'id',
  'slug',
  'brand',
  'model',
  'reference',
  'name',
  'price',
  'currency',
  'status',
  'conditionLabel',
  'badge',
  'movement',
  'caseSize',
  'set',
  'material',
  'edition',
  'description',
  'disclosure',
  'primaryImage',
  'images',
  'inquirySubject',
  'inquiryBody'
];
const allowedStatuses = new Set(['available', 'reserved', 'sold']);

function fail(message) {
  console.error(`Watch inventory validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

assert(existsSync(inventoryPath), `missing ${path.relative(projectRoot, inventoryPath)}`);

let data;
try {
  data = JSON.parse(readFileSync(inventoryPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON: ${error.message}`);
}

for (const field of requiredTopLevelFields) {
  assert(Object.prototype.hasOwnProperty.call(data, field), `missing top-level field "${field}"`);
}

assert(data.schemaVersion === 1, 'schemaVersion must be 1');
assert(/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt), 'updatedAt must be YYYY-MM-DD');
assert(data.currency === 'PHP', 'currency must be PHP');
assert(/^.+@.+\..+$/.test(data.inquiryEmail), 'inquiryEmail must look like an email address');
assert(Array.isArray(data.watches), 'watches must be an array');
assert(data.watches.length >= 1, 'watches must contain at least one watch');

const ids = new Set();
const slugs = new Set();

for (const [index, watch] of data.watches.entries()) {
  const label = watch?.slug || `watch at index ${index}`;
  assert(watch && typeof watch === 'object' && !Array.isArray(watch), `${label} must be an object`);

  for (const field of requiredWatchFields) {
    assert(Object.prototype.hasOwnProperty.call(watch, field), `${label} missing field "${field}"`);
  }

  assert(!ids.has(watch.id), `duplicate id "${watch.id}"`);
  assert(!slugs.has(watch.slug), `duplicate slug "${watch.slug}"`);
  ids.add(watch.id);
  slugs.add(watch.slug);

  assert(typeof watch.id === 'string' && watch.id.trim().length > 0, `${label} id must be non-empty text`);
  assert(/^[a-z0-9-]+$/.test(watch.id), `${label} id must contain only lowercase letters, numbers, and hyphens`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(watch.slug), `${label} slug must be URL-safe kebab-case`);
  assert(Number.isInteger(watch.price) && watch.price >= 0, `${label} price must be a non-negative integer`);
  assert(watch.currency === 'PHP', `${label} currency must be PHP`);
  assert(allowedStatuses.has(watch.status), `${label} status must be available, reserved, or sold`);
  assert(Array.isArray(watch.images) && watch.images.length >= 1, `${label} images must contain at least one image`);
  assert(watch.images.includes(watch.primaryImage), `${label} images must include primaryImage`);

  for (const image of watch.images) {
    assert(typeof image === 'string' && image.startsWith('/watch-assets/'), `${label} image "${image}" must start with /watch-assets/`);
    assert(!image.includes('..'), `${label} image "${image}" must not contain path traversal`);
    assert(/\.(png|jpe?g|webp|avif)$/i.test(image), `${label} image "${image}" must be a supported image file`);
    const imagePath = path.join(projectRoot, 'public', image);
    assert(existsSync(imagePath), `${label} references missing public image ${image}`);
  }

  for (const textField of ['brand', 'model', 'reference', 'name', 'conditionLabel', 'badge', 'movement', 'caseSize', 'set', 'material', 'edition', 'description', 'disclosure', 'inquirySubject', 'inquiryBody']) {
    assert(typeof watch[textField] === 'string' && watch[textField].trim().length > 0, `${label} ${textField} must be non-empty text`);
  }
}

const availableCount = data.watches.filter((watch) => watch.status === 'available').length;
console.log(`Watch inventory valid: ${data.watches.length} watches (${availableCount} available).`);
