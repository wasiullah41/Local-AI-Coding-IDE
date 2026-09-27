const path = require('path');
const { FilesystemService } = require('./backend/src/services/filesystem/filesystem.service.js'); // Assuming compiled structure

async function testTraversal() {
    const service = new FilesystemService();
    const traversalPath = '.././../Windows/System32';

    console.log('Testing path traversal...');
    try {
        await service.readFile(traversalPath);
        console.log('VULNERABILITY: Traversal successful!');
    } catch (err) {
        console.log('Traversal failed, correctly protected:', err.message);
    }
}

testTraversal();
