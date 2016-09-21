# Start with Ubuntu
FROM ubuntu:14.04
# Install all of our dependencies
RUN apt-get update && apt-get install -y wget realpath git gcc python make curl

# Create app directory
# Note: if you change this, you have to change the line under TODO below
WORKDIR /usr/x-compile

# Install rustup, then nightly.
RUN curl -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH /root/.cargo/bin:$PATH
RUN rustup install nightly-2016-09-21
RUN rustup default nightly-2016-09-21
RUN rustup target add mipsel-unknown-linux-gnu
COPY cargo_config /root/.cargo/config

# Pull down and extract the OpenWRT SDK
RUN wget https://s3.amazonaws.com/builds.tessel.io/t2/OpenWRT+SDK/OpenWrt-SDK-ramips-mt7620_gcc-4.8-linaro_uClibc-0.9.33.2.Linux-x86_64.tar.bz2
RUN tar xf OpenWrt-SDK-ramips-mt7620_gcc-4.8-linaro_uClibc-0.9.33.2.Linux-x86_64.tar.bz2

# Ensure our cross compiler is on our path
# TODO: Figure out why the ENV command isn't resolving $PWD correctly (evaluates to '/' in this case)
ENV STAGING_DIR /usr/x-compile/OpenWrt-SDK-ramips-mt7620_gcc-4.8-linaro_uClibc-0.9.33.2.Linux-x86_64/staging_dir
ENV PATH $STAGING_DIR/toolchain-mipsel_24kec+dsp_gcc-4.8-linaro_uClibc-0.9.33.2/bin/:$PATH

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash - && sudo apt-get install -y nodejs

# Docker requires us to set a user for whatever reason (cargo will throw error otherwise)
ENV USER tesselator

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

# Set our active port to 8080
ENV PORT 8080

# Expose our port
EXPOSE $PORT

# Print out debug info from our server
ENV DEBUG *

# Add PM2 for long-lived process mgmt
RUN npm install pm2 -g

# Start up our server with PM2
CMD ["pm2-docker", "start", "index.js"]
