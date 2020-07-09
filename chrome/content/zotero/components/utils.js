const noop = () => {};

var _htmlId = 1;

const nextHtmlId = (prefix = 'id-') => prefix + _htmlId++;

export {
	nextHtmlId,
	noop
};


