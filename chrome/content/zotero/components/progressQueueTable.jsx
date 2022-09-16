/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2022 Corporation for Digital Scholarship
					 Vienna, Virginia, USA
					 https://digitalscholar.org
	
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
import React, { memo, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getDOMElement } from 'components/icons';
import { IntlProvider } from 'react-intl';

import VirtualizedTable, { renderCell } from 'components/virtualized-table';
import { nextHTMLID, noop } from './utils';


function getImageByStatus(status) {
	if (status === Zotero.ProgressQueue.ROW_PROCESSING) {
		return getDOMElement('IconArrowRefresh');
	}
	else if (status === Zotero.ProgressQueue.ROW_FAILED) {
		return getDOMElement('IconCross');
	}
	else if (status === Zotero.ProgressQueue.ROW_SUCCEEDED) {
		return getDOMElement('IconTick');
	}
	return document.createElement('span');
}

const ProgressQueueTable = ({ onActivate = noop, progressQueue }) => {
	const treeRef = useRef(null);
	const htmlID = useRef(nextHTMLID());
	
	const getRowCount = useCallback(() => progressQueue.getTotal(), [progressQueue]);
	
	const rowToTreeItem = useCallback((index, selection, oldDiv = null, columns) => {
		let rows = progressQueue.getRows();
		let row = rows[index];
		
		let div;
		if (oldDiv) {
			div = oldDiv;
			div.innerHTML = "";
		}
		else {
			div = document.createElement('div');
			div.className = "row";
		}

		div.classList.toggle('selected', selection.isSelected(index));

		for (let column of columns) {
			if (column.dataKey === 'success') {
				let span = document.createElement('span');
				span.className = `cell icon ${column.className}`;
				span.appendChild(getImageByStatus(row.status));
				div.appendChild(span);
			}
			else {
				div.appendChild(renderCell(index, row[column.dataKey], column));
			}
		}
		return div;
	}, [progressQueue]);

	const columns = progressQueue.getColumns();

	const tableColumns = [
		{ dataKey: 'success', fixedWidth: true, width: "26" },
		{ dataKey: 'fileName', label: Zotero.getString(columns[0]) },
		{ dataKey: 'message', label: Zotero.getString(columns[1]) },
	];

	const refreshTree = useCallback(() => treeRef.current.invalidate(), []);

	useEffect(() => {
		progressQueue.addListener('rowadded', refreshTree);
		progressQueue.addListener('rowupdated', refreshTree);
		progressQueue.addListener('rowdeleted', refreshTree);

		return () => {
			progressQueue.removeListener('rowadded', refreshTree);
			progressQueue.removeListener('rowupdated', refreshTree);
			progressQueue.removeListener('rowdeleted', refreshTree);
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps
	
	return (
		<IntlProvider locale={ Zotero.locale } messages={ Zotero.Intl.strings }>
			<VirtualizedTable
				getRowCount={ getRowCount }
				ref={ treeRef }
				id={ htmlID.current + '-progress-queue-table' }
				renderItem={ rowToTreeItem }
				showHeader={ true }
				columns={ tableColumns }
				onActivate={ onActivate }
			/>
		</IntlProvider>
	);
};

ProgressQueueTable.propTypes = {
	onActivate: PropTypes.func,
	progressQueue: PropTypes.object.isRequired
};

export default memo(ProgressQueueTable);
