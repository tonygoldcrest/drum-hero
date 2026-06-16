const { execSync } = require('child_process');
const os = require('os');

const env = { ...process.env };

if (os.platform() === 'darwin') {
  try {
    const sdk = execSync('xcrun --show-sdk-path').toString().trim();
    const flags = `-isysroot ${sdk} -I${sdk}/usr/include/c++/v1`;
    env.CXXFLAGS = flags;
    env.CPPFLAGS = flags;
  } catch (_) {}
}

execSync('electron-builder install-app-deps', { stdio: 'inherit', env });
