/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2025 Corporation for Digital Scholarship
					 Vienna, Virginia, USA
					 http://zotero.org
	
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

import VirtualizedTable from 'components/virtualized-table';
import React from 'react'; // eslint-disable-line no-unused-vars
import ReactDOM from "react-dom";

const { renameFilesFromParent } = ChromeUtils.importESModule("chrome://zotero/content/renameFiles.mjs");

var RenameFilesPreview = { // eslint-disable-line no-unused-vars
	rows: [],
	columns: [],
	introEl: null,
	filesListEl: null,
	treeRef: null,
	loadingEl: null,
	progressEl: null,
	acceptBtnEl: null,
	cancelBtnEl: null,

	init: function () {
		this.introEl = document.getElementById('intro');
		this.filesListEl = document.getElementById('renamed-files-list');
		this.loadingEl = document.getElementById('loading');
		this.progressEl = document.getElementById('progress');
		this.progressEl.classList.add('hidden');
		this.acceptBtnEl = document.querySelector('dialog').getButton('accept');
		this.cancelBtnEl = document.querySelector('dialog').getButton('cancel');
		this.acceptBtnEl.disabled = false;
		this.rowRenderer = VirtualizedTable.makeRowRenderer(this.getRowData.bind(this));
		document.addEventListener('dialogaccept', this.handleAcceptClick.bind(this));
		setTimeout(this.pretendRenameItems.bind(this), 0);
	},

	handleAcceptClick: async function (ev) {
		ev.preventDefault();
		this.filesListEl.remove();
		this.progressEl.classList.remove('hidden');
		this.introEl.dataset.l10nId = 'rename-files-preview-renaming';
		this.acceptBtnEl.disabled = true;
		this.cancelBtnEl.disabled = true;
		
		await renameFilesFromParent({ reportProgress: this.updateProgress.bind(this) });
		setTimeout(() => {
			// remain open for a moment longer so that user can see 100% complete
			window.close();
		}, 500);
	},

	prepareColumns: async function () {
		return [
			{ dataKey: 'name', label: '', primary: true, flex: 1 },
		];
	},

	pretendRenameItems: async function () {
		this.columns = await this.prepareColumns();
		let rows = await renameFilesFromParent({ pretend: true });
		this.loadingEl.remove();
		if (rows.length === 0) {
			this.introEl.dataset.l10nId = 'rename-files-preview-no-files';
			this.cancelBtnEl.label = await document.l10n.formatValue('general-done');
			this.acceptBtnEl.remove();
			// There is nothing that would be renamed; ensure the “Rename Files” button is hidden in the preferences pane.
			Zotero.Prefs.set('autoRenameFiles.done', true);
		}
		else {
			this.rows = rows.flatMap(obj => [{ name: obj.oldName }, { name: obj.newName }, { type: 'separator' }]);
			this.acceptBtnEl.disabled = false;
			this.render();
		}
	},

	updateProgress: async function (progress) {
		this.progressEl.value = progress;
	},

	render: function () {
		let customRowHeights = [];
		this.rows.forEach((row, index) => {
			if (row.type === 'separator') {
				customRowHeights.push([index, 8]);
			}
		});

		ReactDOM.createRoot(this.filesListEl).render((
			<VirtualizedTable
				columns={this.columns}
				containerWidth={this.filesListEl.clientWidth}
				customRowHeights={customRowHeights}
				disableFontSizeScaling={true}
				getRowCount={() => this.rows.length}
				getRowHeight={this.getRowHeight.bind(this)}
				id="rename-files-confirm-table"
				isSelectable={this.getIsSelectable.bind(this)}
				ref={ref => this.treeRef = ref}
				renderItem={this.renderItem.bind(this)}
				showHeader={false}
			/>
		));
	},

	renderItem: function (index, selection, oldDiv, ...args) {
		if (this.rows[index].type === 'separator') {
			let div = oldDiv || document.createElement('div');
			div.innerHTML = '';
			div.className = 'row separator';
			return div;
		}
		else {
			let div = this.rowRenderer(index, selection, oldDiv, ...args);
			div.classList.toggle('old', index % 3 === 0);
			div.classList.toggle('new', index % 3 === 1);
			return div;
		}
	},

	getIsSelectable: function (index) {
		return this.rows[index].type !== 'separator';
	},

	getRowData: function (index) {
		return this.rows[index];
	},

	getRowHeight: function ({ _renderedTextHeight }) {
		return _renderedTextHeight;
	}
};
