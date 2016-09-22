# rust-compilation-server
[![Code of Conduct](https://img.shields.io/badge/%E2%9D%A4-code%20of%20conduct-blue.svg?style=flat)](https://github.com/tessel/project/blob/master/CONDUCT.md)

A server to run on an Linux box with Rust MIPS Cross Compilation capabilities.

## Dependencies

* [Docker](https://www.docker.com/products/docker) for containerization. Please install the new "Docker for Mac", "Docker for Windows", or "Docker for Linux" apps to follow the instructions below.

## Install

Local development:

* Clone this repository.
* Run `docker build . -t rustcc`.
* Run `docker run -p 49160:8080 -d rustcc`.

Or, to install from source through Docker:

* Either clone this source or pull the docker image (`docker pull johnnyman727/rust-compilation-server`)
* Build and run the server with `docker run -p 49160:8080 -d johnnyman727/rust-compilation-server`.

The server will be bound to `localhost:49160`. Once the server is running:

* [Clone](https://github.com/tessel/t2-cli) or install the command line interface: `npm install t2-cli -g`
* Make a new directory and inside, create a new Rust project with `t2 init --lang=rust` (it contains a blinky example)
* Deploy the project with `t2 run Cargo.toml --rustcc=$(docker-machine ip):49160`

To make changes to the server, open two shells. In the first, get access to the shell of the Docker server with `docker attach DOCKER_ID` (you can get your `DOCKER_ID` from `docker ps`. Make changes to `index.js` and then run `docker cp index.js DOCKER_ID:/usr/src/app`. If you make changes to the Dockerfile, run `docker build . -t rustcc`.

## Server API

You will need to make a POST request to the `/rust-compile` path on port 49160 of the appropriate IP.

An example of usage is below

```js
return new Promise(function(resolve, reject) {
  var buffers = [];

  var post_options = {
    host: '192.168.99.100',
    port: '49160',
    path: '/rust-compile',
    method: 'POST',
    headers: {
        'Content-Type': 'application/octet-stream',
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

The [cross compilation server](https://github.com/tessel/rust-compilation-server) describes a Docker instance as well as Node server that presents an single API endpoint for cross-compilation for Rust. It receives a POST request that sends a tarred project directory, cross compiles that project, then sends the tarred binary back down to the client.

The cross compilation server is a critical tool for helping new Rust users get started quickly without installing external dependencies. However, we want to encourage users to use [`rustup`](http://blog.rust-lang.org/2016/05/13/rustup.html) locally for more mature Tessel projects. Until we have a path forward for Windows users and infrastructure for building against the Tessel SDK easily, we will be maintaining both implementations to provide the best experiences possible.

## Updating the Build Server
This cross-compilation Docker machine is deployed to a Digital Ocean box at 192.241.138.79. Below are the steps to update it. They assume that you have SSH access to the box. If you think you should but you do not, send a message to the #ops channel on [Tessel Slack](http://tessel-slack.herokuapp.com/).

```
>  ssh root@192.241.138.79
>  docker pull johnnyman727/rust-compilation-server:v1.2 # Replace with destination image
>  docker stop $(docker ps -a -q); docker rm $(docker ps -a -q) # Stop currently running container
>  docker run -p 49160:8080 johnnyman727/rust-compilation-server:v1.2 & # Start the updated server on port 8080 in the background
```
