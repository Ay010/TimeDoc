const { execSync } = require('child_process')
const path = require('path')

exports.default = async function (context) {
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`)
  const iconPath = path.join(__dirname, '..', 'public', 'icon.ico')
  const rceditPath = path.join(__dirname, '..', 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe')

  console.log(`Setting icon on ${exePath}`)
  execSync(`"${rceditPath}" "${exePath}" --set-icon "${iconPath}"`)
  console.log('Icon set successfully!')
}
