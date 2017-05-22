/* global Zotero: false */
'use strict';

const React = require('react');
const ReactDom = require('react-dom');
const TagSelector = require('web-library/tag/tag-selector.js');
const noop = Promise.resolve();
const defaults = {
	tags: [],
	searchString: '',
	shouldFocus: false,
	onSelection: noop
};
const { Cc, Ci } = require('chrome');

class TagSelectorContainer extends React.Component {
	constructor(props) {
		super(props);
		this.opts = Object.assign({}, defaults, props);
		this.selectedTags = new Set();
		this.updateScope = Promise.resolve;
		this.filterToScope = true;
		this.showAutomatic = true;
		this._notifierID = Zotero.Notifier.registerObserver(
			this,
			['collection-item', 'item', 'item-tag', 'tag', 'setting'],
			'tagSelector'
		);
		this._scope = null;
		this._allTags = null;
		this.state = null;
		this.update();
	}

	componentWillReceiveProps(nextProps) {
		this.opts = Object.assign({}, this.opts, nextProps);
		this.update();
	}

	async notify(event, type, ids, extraData) {
		if (type === 'setting') {
			if (ids.some(val => val.split('/')[1] == 'tagColors')) {
				await this.refresh(true);
			}
			return;
		}

		// Ignore anything other than deletes in duplicates view
		if (this.collectionTreeRow.isDuplicates()) {
			switch (event) {
				case 'delete':
				case 'trash':
					break;
				
				default:
					return;
			}
		}

		// Ignore item events other than 'trash'
		if (type == 'item' && event != 'trash') {
			return;
		}

						
		// If a selected tag no longer exists, deselect it
		if (event == 'delete' || event == 'trash' || event == 'modify') {
			// TODO: necessary, or just use notifier value?
			this._allTags = await Zotero.Tags.getAll(this.libraryID, this.showAutomatic ? [0, 1] : [0]);
			
			for (let tag of this.selectedTags) {
				for (let tag2 of this._allTags) {
					if (tag == tag2) {
						var found = true;
						break;
					}
				}
				if (!found) {
					this.selectedTags.delete(tag);
				}
			}
		}
		
		if (event == 'add') {
			if (type == 'item-tag') {
				let tagObjs = ids
					// Get tag name and type
					.map(x => extraData[x])
					// Ignore tag adds for items not in the current library, if there is one
					.filter(x => {
						if (!this._libraryID) {
							return true;
						}
						return x.libraryID == this._libraryID;
					});
				
				if (tagObjs.length) {
					this.insertSorted(tagObjs);
				}
			}
		}

		// Otherwise, just update the tag selector
		return this.updateScope();
	}

	async refresh(fetch) {
		let t = new Date;

		if(this._allTags === null) {
			fetch = true;
		}

		if (fetch) {
			Zotero.debug('Reloading tags selector');
		} else {
			Zotero.debug('Refreshing tags selector');
		}
		
		// If new data, rebuild boxes
		if (fetch) {
			let tagColors = Zotero.Tags.getColors(this.libraryID);
			this._allTags = await Zotero.Tags.getAll(this.libraryID, this.showAutomatic ? [0, 1] : [0]);
				// .tap(() => Zotero.Promise.check(this.mode));
			
			// Add colored tags that aren't already real tags
			let regularTags = new Set(this._allTags.map(tag => tag.tag));
			let coloredTags = Array.from(tagColors.keys());

			coloredTags.filter(ct => !regularTags.has(ct)).forEach(x =>
				this._allTags.push(Zotero.Tags.cleanData({ tag: x }))
			);
			
			// Sort by name
			this._allTags.sort(function (a, b) {
				return Zotero.getLocaleCollation().compareString(1, a.tag, b.tag);
			});
			
		}

		this.update();

		Zotero.debug('Loaded tag selector in ' + (new Date - t) + ' ms');
		
		// var event = new Event('refresh');
		// this.dispatchEvent(event);
	}

	update() {
		var tags;
		let flatScopeTags = Array.isArray(this._scope) ? this._scope.map(tag => tag.tag) : [];

		if('libraryID' in this) {
			var tagColors = Zotero.Tags.getColors(this.libraryID);
		}

		if(this.filterToScope && Array.isArray(this._scope)) {
			tags = this._allTags.filter(tag => 
				flatScopeTags.includes(tag.tag) || (tagColors && tagColors.has(tag.tag))
			);
		} else {
			tags = this._allTags ? this._allTags.slice(0) : [];
		}
		
		if(this.opts.searchString) {
			tags = tags.filter(tag => !!tag.tag.match(new RegExp(this.opts.searchString, 'i')));
		}

		this.opts.tags = tags.map(t => {
			let name = t.tag;
			let selected = this.selectedTags.has(name);
			let color = tagColors && tagColors.has(name) ? tagColors.get(name).color : '';
			let disabled = !flatScopeTags.includes(name);
			return { name, selected, color, disabled };
		});
		this.state ? this.setState(this.opts) : this.state = Object.assign({}, this.opts);
	}

	render() {
		return <TagSelector
			tags={ this.state.tags }
			searchString={ this.state.searchString }
			shouldFocus={ this.state.shouldFocus }
			onSelection={ this.onTagSelectedHandler.bind(this) }
			onTagContext={ this.onTagContextHandler.bind(this) }
			onSearch={ this.onSearchHandler.bind(this) }
			onSettings={ this.onTagSelectorViewSettingsHandler.bind(this) }
		/>;
	}

	setMode(mode) {
		console.warn('Not implemented: setMode: ' + mode);
	}

	focusTextbox() {
		this.opts.shouldFocus = true;
		this.update();
	}

	toggle() {
		this._isCollapsed = !this._isCollapsed;
	}

	unregister() {
		ReactDom.unmountComponentAtNode(this.domEl);
		if (this._notifierID) {
			Zotero.Notifier.unregisterObserver(this._notifierID);
		}
	}

	uninit() {
		this.selectedTags = new Set();
		this.otps.searchString = '';
		this.update();
	}

	onTagContextHandler(tag, ev) {
		let tagContextMenu = document.getElementById('tag-menu');
		ev.preventDefault();
		tagContextMenu.openPopup(ev.target, 'end_before', 0, 0, true);
		this.contextTag = tag;
	}

	onTagSelectorViewSettingsHandler(ev) {
		let settingsContextMenu = document.getElementById('tag-selector-view-settings-menu');
		ev.preventDefault();
		settingsContextMenu.openPopup(ev.target, 'end_before', 0, 0, true);
	}

	onTagSelectedHandler(tag) {
		if(this.selectedTags.has(tag.name)) {
			this.selectedTags.delete(tag.name);
		} else {
			this.selectedTags.add(tag.name);
		}

		if('onSelection' in this.opts && typeof(this.opts.onSelection) === 'function') {
			this.opts.onSelection(this.selectedTags).then(this.refresh.bind(this));
		}
	}

	onSearchHandler(searchString) {
		this.opts.searchString = searchString;
		this.update();
	}

	getTagSelection() {
		return this.selectedTags;
	}

	clearTagSelection() {
		this.selectedTags = new Set();
		return this.selectedTags;
	}
	
	async openColorPickerWindow() {
		var io = {
			libraryID: this.libraryID,
			name: this.contextTag.name
		};
		
		var tagColors = Zotero.Tags.getColors(this.libraryID);
		if (tagColors.size >= Zotero.Tags.MAX_COLORED_TAGS && !tagColors.has(io.name)) {
			var ps = Cc['@mozilla.org/embedcomp/prompt-service;1']
				.getService(Ci.nsIPromptService);
			ps.alert(null, '', Zotero.getString('pane.tagSelector.maxColoredTags', Zotero.Tags.MAX_COLORED_TAGS));
			return;
		}
		
		io.tagColors = tagColors;
		
		window.openDialog(
			'chrome://zotero/content/tagColorChooser.xul',
			'zotero-tagSelector-colorChooser',
			'chrome,modal,centerscreen', io
		);
		
		// Dialog cancel
		if (typeof io.color == 'undefined') {
			return;
		}
		
		await Zotero.Tags.setColor(this.libraryID, io.name, io.color, io.position);
		
		this.refresh();
	}

	async openRenamePrompt() {
		var promptService = Cc['@mozilla.org/embedcomp/prompt-service;1']
			.getService(Ci.nsIPromptService);

		var newName = { value: this.contextTag.name };
		var result = promptService.prompt(window,
			Zotero.getString('pane.tagSelector.rename.title'),
			Zotero.getString('pane.tagSelector.rename.message'),
			newName, '', {});

		if (!result || !newName.value || this.contextTag.name == newName.value) {
			return;
		}
		
		if (this.selectedTags.has(this.contextTag.name)) {
			var wasSelected = true;
			this.selectedTags.delete(this.contextTag.name);
		}
		
		if (Zotero.Tags.getID(this.contextTag.name)) {
			await Zotero.Tags.rename(this.libraryID, this.contextTag.name, newName.value);
		}
		// Colored tags don't need to exist, so in that case
		// just rename the color setting
		else {
			let color = Zotero.Tags.getColor(this.libraryID, this.contextTag.name);
			if (!color) {
				throw new Error("Can't rename missing tag");
			}
			await Zotero.Tags.setColor(this.libraryID, this.contextTag.name, false);
			await Zotero.Tags.setColor(this.libraryID, newName, color);
		}
		
		if(wasSelected) {
			this.selectedTags.add(newName.value);
		}

		this.updateScope();
	}

	async openDeletePrompt() {
		var promptService = Cc['@mozilla.org/embedcomp/prompt-service;1']
			.getService(Ci.nsIPromptService);
			
		var confirmed = promptService.confirm(window,
			Zotero.getString('pane.tagSelector.delete.title'),
			Zotero.getString('pane.tagSelector.delete.message'));
			
		if (!confirmed) {
			return;
		}
			
		var tagID = Zotero.Tags.getID(this.contextTag.name);

		if (tagID) {
			await Zotero.Tags.removeFromLibrary(this.libraryID, tagID);
		}
		// If only a tag color setting, remove that
		else {
			await Zotero.Tags.setColor(this.libraryID, this.contextTag.name, false);
		}

		this.updateScope();
	}

	toggleFilterToScope(newValue) {
		this.filterToScope = typeof(newValue) === 'undefined' ? !this.filterToScope : newValue;
		this.refresh();
	}

	toggleShowAutomatic(newValue) {
		this.showAutomatic = typeof(newValue) === 'undefined' ? !this.showAutomatic : newValue;
		this.refresh(true);
	}

	deselectAll() {
		this.selectedTags = new Set();
		if('onSelection' in this.opts && typeof(this.opts.onSelection) === 'function') {
			this.opts.onSelection(this.selectedTags).then(this.refresh.bind(this));
		}
	}

	set scope(newScope) {
		try {
			this._scope = Array.from(newScope);
		} catch(e) {
			this._scope = null;
		}
		this.refresh();
	}

	get label() {
		let count = this.selectedTags.size;
		let mod = count === 1 ? 'singular' : count === 0 ? 'none' : 'plural';

		return Zotero.getString('pane.tagSelector.numSelected.' + mod, [count]);
	}

	static init(domEl, opts) {
		var ref;
		ReactDom.render(<TagSelectorContainer ref={ c => ref = c } {...opts} />, domEl);
		ref.domEl = domEl;
		return ref;
	}
}

module.exports = TagSelectorContainer;