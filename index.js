// External
var express = require('express');
var tar = require('tar-fs')
var temp = require('temp');

// Internal
var gunzip = require('zlib').createGunzip();
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');

// Initialize Express
var app = express();

// Create a prefix for temporary folders
var tmpPrefix = "tessel-rust-compile"

// Automatically track and cleanup files at exit
temp.track();

// Accept post requests to this route
app.post('/rust-compile', function(req, res) {

    // Create a temporary directory for the incoming project
    temp.mkdir(tmpPrefix, function(err, dirPath) {
      // unzip and extract the binary tarball
      req.pipe(gunzip).pipe(tar.extract(dirPath))
      // Once that process completes
      .on('finish', function extractionComplete() {
          // Create a child process that will compile the project
          var child = exec('cargo build --target=tessel2 --release',
          {
              // Work out of the directory of the created folder
              cwd: dirPath
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
                  var binaryPath = path.join(dirPath, 'target/tessel2/release/hello')
                  // Pack up the compiled binary and send it back down
                  tar.pack(binaryPath).pipe(res);
                  // Send the status flag
                  res.status(200);
              }
          });
      });
    });
});

// Needs to be 5000 for port forwarding on Virtual box to work
app.listen(5000)
