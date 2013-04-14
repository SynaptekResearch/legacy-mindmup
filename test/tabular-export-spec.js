/*global Color, $, describe, it, expect, MM, MAPJS, jasmine, beforeEach */
describe("MM.exportIdeas", function () {
	'use strict';
	it("executes a begin callback, then each callback for for each idea, then end callback and then passes toString results to the callback", function () {
		var aggregate = MAPJS.content({id: 1}),
			calls = [],
			begin = function () { calls.push('begin'); },
			each = function () { calls.push('each'); },
			end = function () { calls.push('end'); },
			contents = function () { calls.push('contents'); return "from contents"; },
			result;
		result = MM.exportIdeas(aggregate, {'each': each, 'begin': begin, 'end': end, 'contents': contents});
		expect(calls).toEqual(['begin', 'each', 'end', 'contents']);
	});
	it("executes a callback for each idea, reverse depth-order, from parent to children", function () {
		var aggregate = MAPJS.content({id: 1, ideas: {1: {id: 2, ideas: {7: {id: 3}}}}}),
			calls = [],
			each = function (idea) { calls.push(idea); };
		MM.exportIdeas(aggregate, {'each': each, 'contents': function () {} });
		expect(calls[0].id).toBe(1);
		expect(calls[1].id).toBe(2);
		expect(calls[2].id).toBe(3);
	});
	it("passes a level with each callback", function () {
		var aggregate = MAPJS.content({id: 1, ideas: {1: {id: 2, ideas: {1: {id: 3}}}}}),
			each = jasmine.createSpy();
		MM.exportIdeas(aggregate, {'each': each, 'contents': function () {} });
		expect(each).toHaveBeenCalledWith(aggregate, 0);
		expect(each).toHaveBeenCalledWith(aggregate.ideas[1], 1);
		expect(each).toHaveBeenCalledWith(aggregate.ideas[1].ideas[1], 2);
	});
	it("sorts children by key, positive first then negative, by absolute value", function () {
		var aggregate = MAPJS.content({id: 1, title: 'root', ideas: {'-100': {title: '-100'}, '-1': {title: '-1'}, '1': {title: '1'}, '100': {title: '100'}}}),
			calls = [],
			each = function (idea) { calls.push(idea.title); };
		MM.exportIdeas(aggregate, {'each': each, 'contents': function () {} });
		expect(calls).toEqual(['root', '1', '100', '-1', '-100']);
	});
});
describe("MM.tabSeparatedTextExporter", function () {
	'use strict';
	it("each indents idea with a tab depending on levels and lists the title", function () {
		var tabExporter = new MM.TabSeparatedTextExporter();
		tabExporter.each({title: 'foo'}, 3);
		expect(tabExporter.contents()).toBe("\t\t\tfoo");
	});
	it("separates nodes by a new line", function () {
		var tabExporter = new MM.TabSeparatedTextExporter();
		tabExporter.each({title: 'foo'}, 0);
		tabExporter.each({title: 'bar'}, 0);
		expect(tabExporter.contents()).toBe("foo\nbar");
	});
	it("replaces tabs and newlines by spaces", function () {
		var tabExporter = new MM.TabSeparatedTextExporter();
		tabExporter.each({title: 'f\to\no\ro'}, 0);
		expect(tabExporter.contents()).toBe("f o o o");
	});
});
describe("MM.htmlTableExporter", function () {
	'use strict';
	it("creates a table with ideas as rows", function () {
		var htmlExporter = new MM.HtmlTableExporter(),
			results;
		htmlExporter.begin();
		htmlExporter.each({title: 'foo'}, 0);
		htmlExporter.each({title: 'bar'}, 0);
		results = $(htmlExporter.contents()).filter('table');
		expect(results.find('tr').first().children('td').first().text()).toBe('foo');
		expect(results.find('tr').last().children('td').first().text()).toBe('bar');
	});
	it("adds a UTF header", function () {
		var htmlExporter = new MM.HtmlTableExporter(),
			result;
		htmlExporter.begin();
		result = $(htmlExporter.contents()).filter('meta');
		expect(result.attr('http-equiv')).toBe('Content-Type');
		expect(result.attr('content')).toBe('text/html; charset=utf-8');
	});
	it("indents with colspan if level > 0", function () {
		var htmlExporter = new MM.HtmlTableExporter(),
			cells;
		htmlExporter.begin();
		htmlExporter.each({title: 'foo'}, 4);
		cells = $(htmlExporter.contents()).find('tr').first().children('td');
		expect(cells.length).toBe(2);
		expect(cells.first().html()).toBe('&nbsp;');
		expect(cells.first().attr('colspan')).toEqual('4');
		expect(cells.last().text()).toBe('foo');
	});
	it("sets the background color according to style and a contrast foreground if background style is present", function () {
		/*jslint newcap:true*/
		var htmlExporter = new MM.HtmlTableExporter(),
			cell;
		htmlExporter.begin();
		htmlExporter.each({attr: {style: {background: '#FF0000'}}}, 0);
		cell = $(htmlExporter.contents()).find('tr').first().children('td').first();
		expect(Color(cell.css('background-color'))).toEqual(Color('#FF0000'));
		expect(Color(cell.css('color'))).toEqual(Color(MAPJS.contrastForeground('#FF0000')));
	});
});
describe("MM.exportToHtmlDocument", function () {
	'use strict';
	it("adds a UTF header", function () {
		var doc = MM.exportToHtmlDocument(MAPJS.content({title: 'z'})),
			result = $(doc).filter('meta');
		expect(result.attr('http-equiv')).toBe('Content-Type');
		expect(result.attr('content')).toBe('text/html; charset=utf-8');
	});
	it("transforms the top level idea into a H1 title", function () {
		var doc = MM.exportToHtmlDocument(MAPJS.content({title: 'z'})),
			result = $(doc).filter('h1');
		expect(result.length).toBe(1);
		expect(result.text()).toBe("z");
	});
	it("transforms the first level subideas into UL/LI list, sorted by child rank", function () {
		var doc = MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: { 6 : {title: 'sub6' }, 5: {title: 'sub5'}}})),
			result = $(doc).filter('ul');
		expect(result.length).toBe(1);
		expect(result.children().length).toBe(2);
		expect(result.children().first()).toBe("li");
		expect(result.children().first().text()).toBe("sub5");
		expect(result.children().last()).toBe("li");
		expect(result.children().last().text()).toBe("sub6");
	});
	it("transforms the lower level subideas into UL/LI lists, sorted by child rank, recursively", function () {
		var doc = MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: { 1: { title: '2', ideas: { 6 : {title: 'sub6' }, 5: {title: 'sub5'}}}}})),
			result = $(doc).filter('ul');
		expect(result.length).toBe(1);
		expect(result.children().length).toBe(1);
		expect(result.children().first()).toBe("li");
		expect(result.children().first().clone().children().remove().end().text()).toBe("2");// have to do this uglyness to avoid matching subelements
		expect(result.children().first().children("ul").length).toBe(1);
		expect(result.children().first().children("ul").children("li").length).toBe(2);
		expect(result.children().first().children("ul").children("li").first().text()).toBe('sub5');
		expect(result.children().first().children("ul").children("li").last().text()).toBe('sub6');
	});
	it("paints the background color according to node", function () {
		/*jslint newcap:true*/
		var doc = MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: { 6 : {title: 's', attr : { style : { background: '#FF0000' }}}}})),
			result = $(doc).filter('ul').children().first();
		expect(Color(result.css('background-color'))).toEqual(Color('#FF0000'));
		expect(Color(result.css('color'))).toEqual(Color(MAPJS.contrastForeground('#FF0000')));
	});
	it("converts ideas with URLs into hyperlinks", function () {
		var doc = MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: {
				6 : {title: 'zoro http://www.google.com'},
			}})),
			result = $(doc).filter('ul').children().first().children().first();
		expect(result).toBe("a");
		expect(result.attr("href")).toBe("http://www.google.com");
		expect(result.text()).toBe("zoro ");
	});
	it("converts ideas with only URLs into hyperlinks using hyperlink as text", function () {
		var doc = MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: {
				6 : {title: 'http://www.google.com'},
			}})),
			result = $(doc).filter('ul').children().first().children().first();
		expect(result).toBe("a");
		expect(result.attr("href")).toBe("http://www.google.com");
		expect(result.text()).toBe("http://www.google.com");
	});
});
