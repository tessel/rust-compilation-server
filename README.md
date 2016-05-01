# rust-compilation-server
A server to run on an Linux box with Rust MIPS Cross Compilation capabilities. 

## Dependencies
* [Docker](https://www.docker.com/) for containerization

## Install
* Either clone this source or pull the docker image (`docker pull johnnyman727/rust-compilation-server`)
* Build and run the server with `docker run -p 49160:8080 -d johnnyman727/rust-compilation-server`. On OSX, the ip address will be the IP Address of your VM (`docker-machine ip`) but on other systems, it will be `localhost`. The port is exposed as 49160.

## Usage
You will need to make a POST request to the `/rust-compile` path on port 49160 of the appropriate IP. You will also need to set three headers: `Content-Type` should be `application/octet stream`, `X-BINARY-NAME` should be the name of the program (we should eventually parse this out of the Cargo.toml), and `X-PROJECT-FOLDER` should be the name of the root directory of the project (we can also probably get rid of this pretty easily).

An example of usage is below

```.js
    return new Promise(function(resolve, reject) {

        var buffers = [];

        var post_options = {
          host: '192.168.99.100',
          port: '49160',
          path: '/rust-compile',
          method: 'POST',
          headers: {
              'Content-Type': 'application/octet-stream',
              'X-BINARY-NAME': project.program,
              'X-PROJECT-FOLDER': path.basename(project.pushdir),
          }
        };

        // Set up the request
        var post_req = http.request(post_options, function(res) {
          var f = reject;
          if (res.statusCode === 200) {
            f = resolve;
          }

          res.on('data', function(chunk) {
              buffers.push(chunk);
          })
          .on('error', function(e) {
              return reject(e);
          })
          .on('end', function() {
              f(Buffer.concat(buffers));
          })
        });

        var outgoingPacker = tar.Pack({ noProprietary: true })
          .on('error', reject)

          // This must be a "directory"
        Reader({ path: project.pushdir, type: "Directory" })
          .on('error', reject)
          .pipe(outgoingPacker)
          .pipe(post_req)
    });
```

The server sends back error code 400 is the compilation fails for whatever reason and writes out the error in the response. If the compilation succeeds, it sends back error code 200 along with the executable.


