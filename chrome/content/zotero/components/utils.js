const noop = () => {};

var _htmlId = 1;

const nextHtmlId = (prefix = 'id-') => prefix + _htmlId++;

const scrollIntoViewIfNeeded = (element, container, opts = {}) => {
	const containerTop = container.scrollTop;
	const containerBottom = containerTop + container.clientHeight;
	const elementTop = element.offsetTop;
	const elementBottom = elementTop + element.clientHeight;

	if (elementTop < containerTop || elementBottom > containerBottom) {
		const before = container.scrollTop;
		element.scrollIntoView(opts);
		const after = container.scrollTop;
		return after - before;
	}
	return 0;
};

export {
	nextHtmlId,
	noop,
	scrollIntoViewIfNeeded
};
