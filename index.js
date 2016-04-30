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
              cwd: projectPath
          },
          function (error, stdout, stderr) {
              // If we had stderr output (like compilation failure)
              if (stderr !== '') {
                  // Something bad happened, report the error
                  res.status(400).send(stderr);
                  return;
              }
              // If we had a different kind of error
              else if (error !== null) {
                  // Report the error
                  res.status(400).send(error);
              }
              // No error on compilation
              else {
                  // Figure out the path to the binary
                  var binaryPath = path.join(projectPath, 'target/tessel2/release/', binaryName);
                  // Pack up the compiled binary and send it back down
                  fs.createReadStream(binaryPath).pipe(res);
                  // Send the status flag
                  res.status(200);
              }
          });
      });
    });
});


app.listen(process.env.PORT || 8080);

console.log('Running on http://localhost:' + process.env.PORT || 8080);
