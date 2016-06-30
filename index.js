// External
var express = require('express');
var tar = require('tar-fs')
var temp = require('temp');
var debug = require('debug')('server');

// System
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');

// Initialize Express
var app = express();

// Create a prefix for temporary folders
var tmpPrefix = "tessel-rust-compile"

// Automatically track and cleanup files at exit
temp.track();

app.get('/', (req, res) => {
  res.send('Tessel Rust Cross Compilation Server!');
})

// Accept post requests to this route
app.post('/rust-compile', function(req, res) {
    var projectName = req.headers['x-project-folder'];
    var binaryName = req.headers['x-binary-name'];
    debug('Received a request for project:', projectName);
    if (!projectName) {
        res.statusCode(400, "Project name header not provided");
        return;
    }

    // Create a temporary directory for the incoming project
    temp.mkdir(tmpPrefix, function(err, dirPath) {
      debug("Saving", projectName, 'to', dirPath, 'with binary name', binaryName);
      // unzip and extract the binary tarball
      req.pipe(tar.extract(dirPath))
      // Once that process completes
      .on('finish', function extractionComplete() {
          var projectPath = path.join(dirPath, projectName);
          // Create a child process that will compile the project
          var child = exec('cargo build --target=tessel2 --release',
          {
              // Work out of the directory of the created folder
              cwd: projectPath,
          },
          function (error, stdout, stderr) {
            debug(`output of compilation - error: ${error}, stdout: ${stdout}, stderr: ${stderr}`)
              // If we had stderr output (like compilation failure)
              if (error !== null) {
                  // Report the error
                  res.status(400).send(error);
              }
              // No error on compilation
              else {
                  // Figure out the path to the binary
                  var binaryPath = path.join(projectPath, 'target/tessel2/release/');
                  // Send the status flag
                  res.status(200);
                  // Pack up the compiled binary and send it back down
                  // TODO: Make the binary the only file in the folder
                  var stream = tar.pack(binaryPath).pipe(res);
                  // When we finish writing the file to the CLI, delete the temp folder
                  stream.once('finish', () => {
                    debug('Finished cross compilation job.');
                    temp.cleanupSync();
                  });
              }
          });
      });
    });
});


app.listen(process.env.PORT || 8080);

console.log('Running Rust Compilation Server on http://localhost:' + process.env.PORT || 8080);
