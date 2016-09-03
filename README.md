# rust-compilation-server
[![Code of Conduct](https://img.shields.io/badge/%E2%9D%A4-code%20of%20conduct-blue.svg?style=flat)](https://github.com/tessel/project/blob/master/CONDUCT.md)

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

## Rationale

We got started on building a cross-compilation server several months ago. @kevinmehall did a bunch of work to figure out exactly how to build a Rust binary for the MIPS architecture and that work has been automated into [this Docker script](https://github.com/tessel/rust-compilation-server/blob/master/Dockerfile).
The [cross compilation server](https://github.com/tessel/rust-compilation-server) includes that Dockerfile as well as Node server that presents an single API endpoint for cross-compilation. It receives a POST request that sends a tarred project directory, cross compiles that project, then sends the tarred binary back down to the client.  The server is awaiting [v1.0 to land](https://github.com/tessel/rust-compilation-server/pull/6).
To run it, clone this directory and checkout the `jon-1.0.0` branch, build the Docker image (requires Docker to be installed) with `docker build . -t rustCC`, then run it with `docker run -p 49160:8080 rustCC`.

The cross compilation server is a critical tool for helping new Rust users get started quickly without installing external dependencies. However, we want to encourage users to use [`rustup`](http://blog.rust-lang.org/2016/05/13/rustup.html) locally for more mature Tessel projects. Until we have a path forward for Windows users and infrastructure for building against the Tessel SDK easy, we will be maintaining both implementations to provide the best experiences possible.

## Developing on the Remote Cross Compilation Server (`Docker`, `git` and `Node` 4.x are requirements)

* Clone the [cross-compilation server repo](https://github.com/tessel/rust-compilation-server) and checkout the `jon-1.0.0` branch.
* Build the Docker image with `docker build -t rustcc .`, then run it with `docker run -p 49160:8080 rustcc`.
* [Clone](https://github.com/tessel/t2-cli) or install the command line interface: `npm install t2-cli -g`
* Make a new directory and inside, create a new Rust project with `t2 init --lang=rust` (it contains a blinky example)
* Deploy the project with `t2 run Cargo.toml --rustcc=$(docker-machine ip):49160`
* To make changes to the server, open two shell. In the first, get access to the shell of the Docker server with `docker attach DOCKER_ID` (you can get your `DOCKER_ID` from `docker ps`. Make changes to `index.js` and then run `docker cp index.js DOCKER_ID:/usr/src/app`. If you make changes to the Dockerfile, run `docker build .`.

