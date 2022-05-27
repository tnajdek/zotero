const fs = require('fs');
const path = require('path');
const http = require('http');
const serveStatic = require('serve-static');
const port = process.env.PORT ?? 8080;

const serve = serveStatic(path.join(__dirname, '..', 'build'), { 'index': false });

const handler = (req, resp) => {
	const fallback = () => {
		resp.setHeader('Content-Type', 'text/plain');
		resp.end("");
	};
	serve(req, resp, fallback);
};


http.createServer(handler).listen(port, () => {
	console.log(`>>> Listening on http://0.0.0.0:${port}/\n`);
});
