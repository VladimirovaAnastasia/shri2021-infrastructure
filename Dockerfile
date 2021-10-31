FROM node:12-alpine
WORKDIR /
COPY . .
RUN npm i
RUN npm build
CMD npm start
