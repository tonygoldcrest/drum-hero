const fs = require('fs');
const path = require('path');
const target = path.resolve(__dirname, '..', '.userdata', 'clean');

fs.rmSync(target, { recursive: true, force: true });
