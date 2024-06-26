/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2020 Corporation for Digital Scholarship
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
import React, { memo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { nextHTMLID } from './utils';

function RadioSet({ autoFocus, className, onChange, onKeyDown, options, value }) {
	const id = useRef(nextHTMLID());
	const fieldsetRef = useRef(null);

	const handleChange = useCallback((ev) => {
		ev.target.focus();
		if (value !== ev.target.value) {
			onChange(ev.target.value);
		}
	}, [value, onChange]);

	const handleKeyDown = useCallback((ev) => {
		let currentIndex = options.findIndex(o => o.value === value);
		currentIndex = currentIndex === -1 ? 0 : currentIndex;

		if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
			let nextIndex = currentIndex + (ev.key === 'ArrowUp' ? -1 : 1);
			nextIndex = (nextIndex < 0 ? nextIndex + options.length : nextIndex) % options.length;
			onChange(options[nextIndex].value);
			fieldsetRef.current.querySelector(`[data-index="${nextIndex}"]`).focus();
		}

		if (onKeyDown) {
			onKeyDown(ev);
		}
	}, [options, onChange, onKeyDown, value]);

	return (
		<fieldset
			className={ cx('form-group radioset', className) }
			onKeyDown={ handleKeyDown }
			ref={ fieldsetRef }
		>
			{ options.map((option, index) => (
				<div key={ option.value } className="radio-container">
					<input
						autoFocus={ autoFocus && index === 0 }
						tabIndex={ option.value === value ? 0 : -1 }
						data-index={ index }
						id={ id.current + '-' + index}
						value={ option.value }
						type="radio"
						checked={ option.value === value }
						onChange={ handleChange }
					/>
					<label htmlFor={ id.current + '-' + index} key={ value }>
						{ option.label }
					</label>
				</div>
			))}
		</fieldset>
	);
}

RadioSet.propTypes = {
	autoFocus: PropTypes.bool,
	className: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	onKeyDown: PropTypes.func,
	options: PropTypes.array.isRequired,
	value: PropTypes.string,
};

export default memo(RadioSet);
