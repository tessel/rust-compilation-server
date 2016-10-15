// External
var express = require('express');
var responseCodes = require('http-response-codes')
var tar = require('tar-fs')
var temp = require('temp');
var toml = require('toml');
var debug = require('debug')('server');
var base64 = require('base64-stream');

// System
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var stream = require('stream');

// Initialize Express
var app = express();

// Create a prefix for temporary folders
var tmpPrefix = "tessel-rust-compile"

// Automatically track and cleanup files at exit
temp.track();

// Accept post requests to this route
app.post('/rust-compile', function(req, res) {

  function rejectRequest(statusCode, errorString) {
    res.status(statusCode).send(JSON.stringify({error: errorString}));
  }

  // Make note that we are starting a ccx process
  debug('Received a request for project - target ${req.query.target}.');

  // Target for build.
  var target = (req.query.target || '').toString();

  // Create a temporary directory for the incoming project
  temp.mkdir(tmpPrefix, function(mkdirError, dirPath) {

    // If there was an error creating a temporary directory
    if (mkdirError !== null) {
      // Abort the request and notify the client
      return rejectRequest(responseCodes.HTTP_INTERNAL_SERVER_ERROR, mkdirError);
    }

    // Create a stream for extracting the uploaded project archive
    var extractStream = tar.extract(dirPath);
    // Send the incoming project tarball into the extractor
    req.pipe(extractStream);
    // Once the extraction completes
    extractStream.once('finish', function extractionComplete() {
      // Read the contents of the extracted directory:
      // -- temp_dir
      // ---- deployed_project_filder
      fs.readdir(dirPath, (readDirError, contents) => {

        // If we were unable to read the directory
        if (readDirError !== null) {
          // Let the client know that we had an issue
          return rejectRequest(responseCodes.HTTP_INTERNAL_SERVER_ERROR, readDirError);
        }

        // There should only be a single folder (the deployed folder)
        if (contents.length !== 1) {
          // If there zero or more than one, reject and notify client
          return rejectRequest(responseCodes.HTTP_BAD_REQUEST,
            'Too many project directories deployed.');
        }

        // Save the name of the deployed project folder
        projectName = contents.shift();
        debug("Project name:", projectName);
        // Save the path to this project
        var projectPath = path.join(dirPath, projectName);

        // // Save a path to where the compiled binary will be
        // var binaryPath = path.join(projectPath, 'target/mipsel-unknown-linux-gnu/release/');
        //
        // // Read the contents of the Cargo.toml to extract binary name
        // // Print out the binary name
        // try {
        //   var cargoToml = toml.parse(fs.readFileSync(path.join(projectPath, 'Cargo.toml'), 'utf8'));
        // }
        // catch (error) {
        //   debug("Problem parsing Cargo.toml :", error);
        //   return rejectRequest(responseCodes.HTTP_BAD_REQUEST, error);
        // }

        // Ensure the Cargo.toml has a package field and a name property
        // if (cargoToml.package === undefined || cargoToml.package.name === undefined) {
        //   return rejectResponse(responseCodes.HTTP_BAD_REQUEST, 'No package name found in Cargo.toml');
        // }

        // Save the name of the final binary so we can exclude all other files
        // var binaryName = cargoToml.package.name;

        // Create a child process that will compile the project
        var child = spawn('cargo', ['tessel', 'build', '--bin', target],
        {
          // Work out of the directory of the created folder
          cwd: projectPath,
        });

        var stdout = [];
        child.stdout.on('data', (data) => {
          stdout.push(data);
        })

        var stderr = [];
        child.stderr.on('data', (data) => {
          stderr.push(data);
        })

        child.on('error', (error) => {
          // Report the error
          rejectRequest(responseCodes.HTTP_INTERNAL_SERVER_ERROR, error.message);
        });

        child.on('close', (status) => {
          // trim stdout/stderr
          stderr = Buffer.concat(stderr).toString().replace(/^\s+|\s+$/g, '');
          stdout = Buffer.concat(stdout).toString().replace(/^\s+|\s+$/g, '');

          debug(`output of compilation - status: ${status}, stdout: ${stdout}, stderr: ${stderr}`)

          // If no file was generated:
          if (status != 0 || stdout == '') {
            // Report the error
            return rejectRequest(responseCodes.HTTP_INTERNAL_SERVER_ERROR, stderr);
          }
          // Send the status flag
          res.status(responseCodes.HTTP_OK);

          var binaryPath = stdout;

          /*
           Write all the parts of the results JSON except the binary.
           We do this instead of writing with JSON.stringify because
           we'll want to stream the binary tarball into the JSON
           response as it's packed instead of waiting for the entire
           buffer to load into RAM.
           */
          res.write(`{`);
          res.write(`"stdout":${JSON.stringify(stdout)}`);
          res.write(`,`);
          res.write(`"stderr":${JSON.stringify(stderr)}`);
          res.write(`,`);
          res.write(`"binary": "`);

          // Create a stream that starts packing only the compiled binary
          // Base-64 encode it because we're loading it into JSON (strings)
          var packingStream = fs.createReadStream(binaryPath)
            .pipe(base64.encode());

          // Pipe the archived binary into the result but do not end response pipe
          // when the tarball packing completes
          packingStream.pipe(res, { end: false });
          // When the binary has been written,
          packingStream.once('end', () => {
            // Write the ending quote and bracket for the JSON
            res.end(`"}`);
            // Make a note for our logs
            debug('Finished cross compilation job.');
            // Delete the temporary directory
            temp.cleanupSync();
          });
        });
      })
    });
  });
});


app.listen(process.env.PORT || 8080);

console.log('Running Rust Compilation Server on http://localhost:' + (process.env.PORT || 8080));
