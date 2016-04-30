# Start with Ubuntu
FROM ubuntu:14.04
# Install all of our dependencies
RUN apt-get update && apt-get install -y wget realpath git gcc python make curl

# Pull down and extract the OpenWRT SDK
RUN wget https://s3.amazonaws.com/builds.tessel.io/t2/OpenWRT+SDK/OpenWrt-SDK-ramips-mt7620_gcc-4.8-linaro_uClibc-0.9.33.2.Linux-x86_64.tar.bz2
RUN tar xf OpenWrt-SDK-ramips-mt7620_gcc-4.8-linaro_uClibc-0.9.33.2.Linux-x86_64.tar.bz2

# Ensure our cross compiler is on our path
ENV STAGING_DIR  $PWD/OpenWrt-SDK-ramips-mt7620_gcc-4.8-linaro_uClibc-0.9.33.2.Linux-x86_64/staging_dir
ENV PATH $STAGING_DIR/toolchain-mipsel_24kec+dsp_gcc-4.8-linaro_uClibc-0.9.33.2/bin/:$PATH

# Pull down Rust source @ 1.5.0
RUN git clone https://github.com/rust-lang/rust; cd rust; git checkout tags/1.5.0
# Pull down and extract the Rust installer
RUN wget https://static.rust-lang.org/dist/rust-1.5.0-x86_64-unknown-linux-gnu.tar.gz
RUN tar xf rust-1.5.0-x86_64-unknown-linux-gnu.tar.gz
# Install the cloned version of Rust
RUN rust-1.5.0-x86_64-unknown-linux-gnu/install.sh --prefix=$PWD/rust-root

# Pull down @kevinmehall's cross compilation script and a device config for Tessel 2
RUN wget https://gist.githubusercontent.com/kevinmehall/16e8b3ea7266b048369d/raw/87e6885967c59368f4a53b5ab1122f24db84ba70/rust-cross-libs.sh && chmod +x rust-cross-libs.sh
RUN wget https://gist.githubusercontent.com/kevinmehall/16e8b3ea7266b048369d/raw/87e6885967c59368f4a53b5ab1122f24db84ba70/tessel2.json

# Cross compile the standard libraries for Tessel 2
RUN ./rust-cross-libs.sh --rust-prefix=$PWD/rust-root --rust-git=rust --target-json=tessel2.json

# Docker requires us to set a user for whatever reason (cargo will throw error otherwise)
ENV USER tesselator

# Set our PATH so we can use Rust binaries and our newly compiled standard lib
ENV PATH $PWD/rust-root/bin:$PATH
ENV LD_LIBRARY_PATH $PWD/rust-root/lib
ENV RUST_TARGET_PATH $PWD

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash - && sudo apt-get install -y nodejs

# Create app directory
RUN mkdir -p /usr/src/app
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

# Start up our server
CMD ["node", "index.js"]
