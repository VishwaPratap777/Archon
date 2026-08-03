const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = ['node_modules', '.next', '.git', 'dist'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.md'];

let totalFiles = 0;
let totalLines = 0;

const extStats = {};

function countLines(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
}

function walkSync(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!EXCLUDE_DIRS.includes(file)) {
                walkSync(fullPath);
            }
        } else {
            const ext = path.extname(file);
            if (ALLOWED_EXTENSIONS.includes(ext)) {
                totalFiles++;
                const lines = countLines(fullPath);
                totalLines += lines;
                
                if (!extStats[ext]) extStats[ext] = { files: 0, lines: 0 };
                extStats[ext].files++;
                extStats[ext].lines += lines;
            }
        }
    }
}

walkSync(__dirname);

let output = `Wamious Project Metrics\n`;
output += `=======================\n\n`;
output += `Total Files: ${totalFiles}\n`;
output += `Total Lines of Code: ${totalLines}\n\n`;
output += `Breakdown by extension:\n`;
for (const [ext, stats] of Object.entries(extStats)) {
    output += `  ${ext}: ${stats.files} files, ${stats.lines} lines\n`;
}

fs.writeFileSync('metrics.txt', output, 'utf8');
console.log(output);
