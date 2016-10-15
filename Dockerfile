# Start with Ubuntu
FROM ubuntu:14.04
# Install all of our dependencies
RUN apt-get update && apt-get install -y wget realpath git gcc python make curl

# Create app directory
# Note: if you change this, you have to change the line under TODO below
WORKDIR /usr/x-compile

# Install rustup, then stable.
RUN curl -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH /root/.cargo/bin:$PATH
RUN rustup install stable

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash - && sudo apt-get install -y nodejs

# Create app directory
WORKDIR /usr/src/app

# Set our active port to 8080
ENV PORT 8080

# Expose our port
EXPOSE $PORT

# Print out debug info from our server
ENV DEBUG *

# Docker requires us to set a user for whatever reason (cargo will throw error otherwise)
ENV USER root
RUN chown -R $USER /root

# Add PM2 for long-lived process mgmt
RUN npm install pm2 -g
RUN npm install t2-cli -g

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

# Start up our server with PM2
CMD ["pm2-docker", "start", "index.js"]
