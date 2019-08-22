﻿(function ($) {

    // Extension for creating datagridviews; supports multiple creations in one call
    $.fn.datagridview = function (settings, callback) {
        // Allow callback to be the only argument
        if ($.isFunction(settings)) {
            callback = settings;
            settings = null;
        }

        return $(this).each(function () {
            let datagridview = $(this).data('datagridview');

            if (!$(this).data('datagridview')) {
                // Validate columns
                if (!settings || !settings.columns) {
                    throw 'datagridview error: expected required option "columns"';
                }
                else if (!$.isArray(settings.columns)) {
                    throw 'datagridview error: expected option "columns" to be an array';
                }
                else if (!settings.columns.every(function (column) {
                    return !!column.data;
                })) {
                    throw 'datagridview error: expected each item in option "columns" to have property "data"';
                }

                // Create object
                let options = $.extend({}, $.fn.datagridview.defaults, settings);
                datagridview = new DataGridView($(this), options);

                // Add object to data
                $(this).data('datagridview', datagridview);
            }

            // Call the callback, bound to the datagridview
            if ($.isFunction(callback)) {
                callback.bind(datagridview)(datagridview);
            }
        });
    }

    // Set defaults for extension
    $.fn.datagridview.defaults = {
        // Get initial meta data
        // Expects a DataGridViewMetaData object
        getMetaData: function (element) {
            return new DataGridViewMetaData(null, false, 0, 1, 0);
        },
        // Footer functions, in order, to use for the footer
        getFooterPlugins: function (element) {
            return [
                $.fn.datagridview.footerPlugins.prevNext,
                $.fn.datagridview.footerPlugins.pageInput,
                $.fn.datagridview.footerPlugins.pageSizeInput,
                $.fn.datagridview.footerPlugins.displayFull
            ];
        },
        // Allow columns to be resized
        allowColumnResize: function (element) {
            return $(element).data('column-resize') !== undefined && $(element).data('column-resize') != false;
        },
        // Allow columns to be moved around
        allowColumnMove: function (element) {
            return $(element).data('column-move') !== undefined && $(element).data('column-move') != false;
        },
        // Allow the user to select rows
        allowSelect: function (element) {
            return $(element).data('select') !== undefined && $(element).data('select') != false;
        },
        // If select is enabled, allow multiple row selection
        isMultiselect: function (element) {
            return $(element).data('multiselect') !== undefined && $(element).data('multiselect') != false;
        }
    }

    // Pagination footer plugins
    // This can easily be extended
    // Please note that the page index is 0-based and needs to be corrected for display purposes
    $.fn.datagridview.footerPlugins = {
        displayBasic: function (footerElement, metaData, datagridview) {
            $(footerElement).append($('<div>').text("Page " + (metaData.page + 1) + " of " + metaData.totalPages));
        },
        displayFull: function (footerElement, metaData, datagridview) {
            let rowStart = metaData.page * metaData.rowsPerPage + 1;
            let rowEnd = (metaData.page + 1) * metaData.rowsPerPage;

            $(footerElement).append($('<div>').text("Page " + (metaData.page + 1) + " of " + metaData.totalPages + ", rows " + rowStart + " to " + rowEnd + " of " + metaData.totalRows));
        },
        prevNext: function (footerElement, metaData, datagridview) {
            // To disable any of these options, simply hide them in css for the all, or just the appropriate grids
            let first = $('<button>')
                .addClass('datagridview-paging-first')
                .text('|<')
                .click(function () { datagridview.initiatePaging(0, metaData.rowsPerPage); })
                .prop('disabled', metaData.page <= 0);

            let prev = $('<button>')
                .addClass('datagridview-paging-prev')
                .text('<')
                .click(function () { datagridview.initiatePaging(metaData.page - 1, metaData.rowsPerPage); })
                .prop('disabled', metaData.page <= 0);

            $(footerElement).append(first, prev);

            for (let page = Math.max(0, metaData.page - 4); page < Math.min(metaData.totalPages, metaData.page + 5); page++) {
                // Using an iterator in an anonymous function does not work as expected cross-browser
                let currentPage = page;

                $(footerElement).append($('<button>')
                    .addClass('datagridview-paging-page')
                    .text(currentPage + 1)
                    .click(function () { datagridview.initiatePaging(currentPage, metaData.rowsPerPage); })
                    .prop('disabled', metaData.page === currentPage));
            }

            let next = $('<button>')
                .addClass('datagridview-paging-next')
                .text('>')
                .click(function () { datagridview.initiatePaging(metaData.page + 1, metaData.rowsPerPage); })
                .prop('disabled', metaData.page >= metaData.totalPages - 1);

            let last = $('<button>')
                .addClass('datagridview-paging-last')
                .text('>|')
                .click(function () { datagridview.initiatePaging(metaData.totalPages - 1, metaData.rowsPerPage); })
                .prop('disabled', metaData.page >= metaData.totalPages - 1);

            $(footerElement).append(next, last);
        },
        pageInput: function (footerElement, metaData, datagridview) {
            let page = $('<input>', { type: 'text' })
                .addClass('datagridview-paging-page')
                .val(metaData.page + 1);
            let label = $('<span>')
                .addClass('datagridview-paging-page-label')
                .text('Page: ')
            let go = $('<button>')
                .addClass('datagridview-paging-go')
                .text('Go')
                .click(function () {
                    datagridview.initiatePaging(page.val() - 1, metaData.rowsPerPage);
                });

            $(footerElement).append(label, page, go);
        },
        pageSizeInput: function (footerElement, metaData, datagridview) {
            let pageSize = $('<input>', { type: 'text' })
                .addClass('datagridview-paging-page-size')
                .val(metaData.rowsPerPage);
            let label = $('<span>')
                .addClass('datagridview-paging-page-size-label')
                .text('Page size: ')
            let go = $('<button>')
                .addClass('datagridview-paging-go')
                .text('Go')
                .click(function () {
                    datagridview.initiatePaging(metaData.page, pageSize.val());
                });

            $(footerElement).append(label, pageSize, go);
        }
    }

    // Datagridview implementation
    function DataGridView(element, options) {
        let base = this;
        let i = 0;

        this.element = element;
        this.options = options;
        this.data = [];
        this.allowColumnResize = this.options.allowColumnResize(this.element);
        this.headerResizeState = {
            dragging: false
        };
        this.allowColumnMove = this.options.allowColumnMove(this.element);
        this.headerMoveState = {
            dragging: false
        }
        this.allowSelect = this.options.allowSelect(this.element);
        this.isMultiselect = this.allowSelect && this.options.isMultiselect(this.element);
        this.selectState = {
            selecting: false,
            dragging: false
        }
        this.metaData = this.options.getMetaData(this.element);
        this.elementClass = 'datagridview-' + Math.random().toString().replace('.', '');
        this.element.addClass('datagridview');
        this.element.addClass(this.elementClass);
        this.element.children().hide();
        this.header = this.createElement('<div>', 'datagridview-header');
        this.body = this.createElement('<div>', 'datagridview-body');
        this.contentContainer = this.createElement('<div>', 'datagridview-content-container').toggleClass('datagridview-container-multiselect', this.isMultiselect).append(this.header, this.body);
        this.footer = this.createElement('<div>'); // Placeholder only
        this.footerPlugins = this.options.getFooterPlugins(this.element);
        this.sortToggle = this.createElement('<div>', 'datagridview-sort-toggle');
        this.element.append(
            this.contentContainer,
            this.footer
        );

        this.style = this.createElement('<style>', { type: 'text/css' });
        $('body').append(this.style);

        // Create columns
        this.options.columns.forEach(function (column) {
            // Define class
            column.id = Math.random().toString().replace('.', '');
            column.columnClass = 'datagridview-column-' + column.id;
            column.width = isNaN(column.width) || column.width <= 0 ? 10 : parseFloat(column.width);
            column.defaultWidth = column.width;
            column.visible = column.visible !== false;
            column.index = i++;

            if (!$.isFunction(column.renderer)) {
                column.renderer = null;
            }

            let headerCell = base.createElement('<div>', 'datagridview-header-cell')
                .addClass(column.columnClass)
                .toggleClass('datagridview-header-cell-sortable', column.sortable !== false)
                .text(column.header || column.data)
                .attr('title', column.header || column.data)
                .data('id', column.id)
                .data('column', column.data)
                .data('sort-column', column.sortData || column.data);

            if (column.class) {
                headerCell.addClass(column.class);
            }

            if (base.allowColumnResize) {
                // Drag item
                headerCell.prepend(base.createElement('<div>', 'datagridview-header-drag'));
            }

            base.header.append(headerCell);
        });

        this.setColumnStyle();

        // Use the meta data if present to display appropriate sorting and paging
        this.displaySortOrder();
        this.displayFooters();

        // Event handlers
        this.header.on('mouseup', 'div.datagridview-header-cell-sortable', this, eventHandlers.sort);

        if (this.allowColumnResize) {
            this.header.on('mousedown', 'div.datagridview-header-drag', this, eventHandlers.columnResizeStart);
            $(document).on('mousemove', this, eventHandlers.columnResize);
            $(document).on('mouseup', this, eventHandlers.columnResizeEnd);
        }

        if (this.allowColumnMove) {
            this.header.on('mousedown', 'div.datagridview-header-cell', this, eventHandlers.columnMoveStart);
            $(document).on('mousemove', this, eventHandlers.columnMove);
            $(document).on('mouseup', this, eventHandlers.columnMoveEnd);
        }

        if (this.allowSelect) {
            this.element.on('mousedown', 'div.datagridview-row', this, eventHandlers.rowSelectStart);
            this.element.on('mouseenter', 'div.datagridview-row', this, eventHandlers.rowSelect);
            this.element.on('mouseup', 'div.datagridview-row', this, eventHandlers.rowSelectEnd);
        }
    }

    // Set the column styles
    DataGridView.prototype.setColumnStyle = function () {
        let style = '';
        let tableWidth = this.options.columns.filter(function (c) { return c.visible; }).reduce(function (w, c) { return w + c.width; }, 0);

        if (tableWidth > 100) {
            style = '.' + this.elementClass + ' div.datagridview-header, .' + this.elementClass + ' div.datagridview-body { width: ' + tableWidth + '%; }\n';
        }

        this.style.html(this.options.columns.reduce(function (style, column) {
            if (column.visible) {
                return style + '.' + column.columnClass + '{ flex-grow: ' + column.width + '; order: ' + column.index + '; }\n';
            }
            else {
                return style + '.' + column.columnClass + '{ display: none; }\n';
            }
        }, style));
    }

    // Fill the grid with the data
    DataGridView.prototype.populate = function (metaData, data) {
        let newBody = this.createElement('<div>', 'datagridview-body');

        for (let r = 0; r < data.length; r++) {
            let dataRow = data[r];
            let row = this.createElement('<div>', 'datagridview-row');

            for (let c = 0; c < this.options.columns.length; c++) {
                let column = this.options.columns[c];
                let cell = this.createElement('<div>', column.columnClass);
                
                if (column.class) {
                    cell.addClass(column.class);
                }

                if (column.renderer) {
                    column.renderer(cell, dataRow[column.data], dataRow);
                }
                else {
                    cell.text(dataRow[column.data] || "").attr('title', dataRow[column.data] || "");
                }

                row.append(cell);
            }

            newBody.append(row);
        };

        this.body.replaceWith(newBody);
        this.body = newBody;
        this.data = data;

        // Use the new meta data if present to display appropriate sorting and paging
        if (metaData instanceof DataGridViewMetaData) {
            this.metaData = metaData;
        }
        // Try to resolve the meta data as far as we can
        else if (metaData) {
            this.metaData = new DataGridViewMetaData(metaData.sortColumn, metaData.sortDescending, metaData.totalRows || this.data.length, metaData.rowsPerPage || this.data.length, metaData.page || 0);
        }
        // Default
        else {
            this.metaData = new DataGridViewMetaData(this.metaData.sortColumn, this.metaData.sortDescending, this.data.length, this.data.length, 0);
        }

        this.displaySortOrder();
        this.displayFooters();
    }

    // Create an element and merge attribute objects to attributes
    DataGridView.prototype.createElement = function (tagName, className) {
        let attributes = $.extend.apply({}, Array.prototype.slice.call(arguments, 2));
        let element = $(tagName, attributes).addClass(className);

        return element;
    }

    // Remove the entire datagridview; resets the base element to its former state
    DataGridView.prototype.remove = function () {
        this.element.removeClass('datagridview');
        this.element.removeClass(this.elementClass);
        this.element.children().show();
        this.contentContainer.remove();
        this.footer.remove();
        this.style.remove();
    }

    // Get meta currently in use; these can be edited and passed back via populate
    DataGridView.prototype.getMetaData = function () {
        return this.metaData.clone();
    }

    // Set sorting icon after sorting action
    DataGridView.prototype.displaySortOrder = function () {
        let base = this;
        let header = this.header.find('div.datagridview-header-cell').filter(function () { return $(this).data('sort-column') === base.metaData.sortColumn });

        if (header.length > 0) {
            if (this.metaData.sortDescending) {
                this.sortToggle.removeClass('datagridview-sort-toggle-ascending').addClass('datagridview-sort-toggle-descending');
            }
            else {
                this.sortToggle.removeClass('datagridview-sort-toggle-descending').addClass('datagridview-sort-toggle-ascending');
            }

            header.append(this.sortToggle);
            this.sortToggle.show();
        }
        else {
            this.sortToggle.hide();
        }
    }

    // Create the footers
    DataGridView.prototype.displayFooters = function () {
        let base = this;
        let newFooter = this.createElement('<div>', 'datagridview-footer');

        this.footer.children().remove();

        if (this.footerPlugins.length !== 0) {
            $.each(this.footerPlugins, function () {
                let footerElement = base.createElement('<div>', 'datagridview-footer-element');

                newFooter.append(footerElement);
                this(footerElement, base.getMetaData(), base);
            });
        }

        this.footer.replaceWith(newFooter);
        this.footer = newFooter;
    }

    // Get the column definitions currently in use; creates a copy
    DataGridView.prototype.getColumns = function () {
        return this.options.columns.map(function (column) {
            return {
                id: column.id,
                width: column.width,
                visible: column.visible,
                data: column.data,
                sortData: column.sortData,
                sortable: column.sortable,
                index: column.index,
                class: column.class
            };
        });
    }

    // Get selected rows
    DataGridView.prototype.getSelectedRows = function () {
        return this.body.find('.datagridview-row-selected');
    }

    // Get selected indexes
    DataGridView.prototype.getSelectedIndexes = function () {
        return this.getSelectedRows().map(function () {
            return $(this).index();
        }).get();
    }

    // Get selected data
    DataGridView.prototype.getSelectedData = function () {
        let base = this;

        return this.getSelectedIndexes().map(function (index) {
            return base.data[index];
        });
    }

    // Internal function for altering selection
    DataGridView.prototype.alterSelection = function (rows, selectedRows, toggle, resetSelection) {
        let selectionChanged = false;

        // Reset selection means we unselect the selected rows that aren't in the current selection
        if (resetSelection) {
            let unselectRows = rows.not(selectedRows).filter('.datagridview-row-selected');

            if (unselectRows.length > 0) {
                selectionChanged = true;
                unselectRows.removeClass('datagridview-row-selected');
            }
        }

        // If we toggle then all selected rows will be unselected or vice versa
        if (toggle) {
            if (selectedRows.length > 0) {
                selectionChanged = true;
                selectedRows.toggleClass('datagridview-row-selected');
            }
        }
        // Else we detect which rows to select that haven't been selected
        else {
            selectedRows = selectedRows.not('.datagridview-row-selected');

            if (selectedRows.length > 0) {
                selectionChanged = true;
                selectedRows.addClass('datagridview-row-selected');
            }
        }

        if (selectionChanged) {
            this.element.trigger('datagridview.selectionChanged');
        }
    }

    // Set selected rows by selector/selection/function/element
    DataGridView.prototype.setSelectedRows = function (selector) {
        let rows = this.body.find('.datagridview-row');
        let selectedRows = rows.filter(selector);

        if (!this.allowSelect) {
            selectedRows = $(false);
        }
        if (!this.isMultiselect) {
            selectedRows = selectedRows.first();
        }

        this.alterSelection(rows, selectedRows, false, true);
    }

    // Set selected rows by index
    DataGridView.prototype.setSelectedIndexes = function (indexes) {
        let rows = this.body.find('.datagridview-row');
        let selectedRows = rows.filter(function (index) {
            return indexes.filter(function (v) { return v === index; }).length > 0;
        })

        this.setSelectedRows(selectedRows);
    }

    // Set selected rows by filter function applied to data array
    // Filter function arguments are the standard array filter function arguments value, index, array
    DataGridView.prototype.setSelectedData = function (filter) {
        let indexes = [];

        this.data.forEach(function (value, index, array) {
            if (filter(value, index, array)) {
                indexes.push(index);
            }
        });

        this.setSelectedIndexes(indexes);
    }

    // Initiate paging event
    DataGridView.prototype.initiatePaging = function (page, rowsPerPage) {
        // We work with a copy of the element; we only set paging when getting data in
        let metaData = new DataGridViewMetaData(this.metaData.sortColumn, this.metaData.sortDescending, this.metaData.totalRows, rowsPerPage || this.metaData.rowsPerPage, page);

        this.element.trigger('datagridview.paged', metaData);
    }

    // Toggle the visibility of a column
    // This allows you to show or hide columns by external means
    // Once the user has reduced column width to 0 it becomes invisible so this is a way to make it visible again
    DataGridView.prototype.toggleColumnVisibility = function (id, visible) {
        let columns = this.options.columns.filter(function (column) { return column.id === id; });

        if (columns.length === 1) {
            visible = visible !== false;

            if (visible && !columns[0].visible) {
                columns[0].width = columns[0].defaultWidth;
            }

            columns[0].visible = visible;

            this.setColumnStyle();
        }
    }

    // Event handlers should not be accessible from the object itself
    let eventHandlers = {
        columnMoveStart: function (e) {
            if (e.which !== 1 || $(e.target).hasClass('datagridview-header-drag')) {
                return;
            }

            e.data.headerMoveState.position = e.pageX;
            e.data.headerMoveState.header = $(this).closest('.datagridview-header-cell');
            e.data.headerMoveState.column = e.data.options.columns.filter(function (c) { return c.id === e.data.headerMoveState.header.data('id'); })[0];
            e.data.headerMoveState.draggingStart = true;
        },
        columnMove: function (e) {
            // Only start actually dragging when the distance is more than a few pixels
            if (!e.data.headerMoveState.draggingStart || Math.abs(e.data.headerMoveState.position - e.pageX) < 3) {
                return;
            }

            let headers = e.data.header.find('.datagridview-header-cell');
            let position = e.pageX - e.data.element.position().left + e.data.contentContainer.scrollLeft();

            if (!e.data.headerMoveState.indicator) {
                e.data.headerMoveState.indicator = e.data.createElement('<div>', 'datagridview-header-move-indicator').hide();
                e.data.headerMoveState.indicator.css('top', e.data.header.outerHeight(true) + 'px');
                e.data.contentContainer.append(e.data.headerMoveState.indicator);
            }

            if (!e.data.headerMoveState.title) {
                e.data.headerMoveState.title = e.data.createElement('<div>', 'datagridview-header-move-title').text(e.data.headerMoveState.column.header || e.data.headerMoveState.column.data);
                e.data.contentContainer.append(e.data.headerMoveState.title);
            }

            e.data.headerMoveState.dragging = true;
            e.data.headerMoveState.title.css('top', e.pageY + 5 - e.data.element.position().top + 'px');
            e.data.headerMoveState.title.css('left', e.pageX + 15 - e.data.element.position().left + 'px');

            // Figure out where in the columns the to add the indicator
            // First look to the left
            if (position < e.data.headerMoveState.header.position().left) {
                for (let i = e.data.headerMoveState.column.index; i >= 0; i--) {
                    let header = headers.filter(function () { return $(this).data('id') == e.data.options.columns[i].id; });

                    if (position > header.position().left) {
                        e.data.headerMoveState.indicator.css('left', header.position().left + 'px');
                        e.data.headerMoveState.indicator.show();
                        break;
                    }
                }
            }
            // Then look to the right
            else if (position > e.data.headerMoveState.header.position().left + e.data.headerMoveState.header.outerWidth(true)) {
                for (let i = e.data.headerMoveState.column.index; i < e.data.options.columns.length; i++) {
                    let header = headers.filter(function () { return $(this).data('id') == e.data.options.columns[i].id; });

                    if (position < header.position().left + header.outerWidth(true)) {
                        e.data.headerMoveState.indicator.css('left', header.position().left + header.outerWidth(true) + 'px');
                        e.data.headerMoveState.indicator.show();
                        break;
                    }
                }
            }
            // If we've not gone far enough to the right or left, the column will not move so the indicator is hidden
            else {
                e.data.headerMoveState.indicator.hide();
            }
        },
        columnMoveEnd: function (e) {
            if (e.which !== 1 || !e.data.headerMoveState.dragging) {
                e.data.headerMoveState.draggingStart = false;
                return;
            }

            let headers = e.data.header.find('.datagridview-header-cell');
            let header = null;
            let position = e.pageX - e.data.element.position().left + e.data.contentContainer.scrollLeft();

            // Figure out where the column needs to move to by finding the header which it will replac
            // First look to the left
            if (position < e.data.headerMoveState.header.position().left) {
                for (let i = e.data.headerMoveState.column.index; i >= 0; i--) {
                    header = headers.filter(function () { return $(this).data('id') == e.data.options.columns[i].id; });

                    if (position > header.position().left) {
                        break;
                    }
                };
            }
            // Then look to the right
            else if (position > e.data.headerMoveState.header.position().left + e.data.headerMoveState.header.outerWidth(true)) {
                for (let i = e.data.headerMoveState.column.index; i < e.data.options.columns.length; i++) {
                    header = headers.filter(function () { return $(this).data('id') == e.data.options.columns[i].id; });

                    if (position < header.position().left + header.outerWidth(true)) {
                        break;
                    }
                }
            }

            if (header) {
                // Rearrange the columns array
                let oldIndex = e.data.options.columns.indexOf(e.data.headerMoveState.column);
                let newIndex = e.data.options.columns.indexOf(e.data.options.columns.filter(function (c) { return c.id === header.data('id'); })[0]);
                let i = 0;

                e.data.options.columns.splice(newIndex, 0, e.data.options.columns.splice(oldIndex, 1)[0]);

                // Reset indexes
                e.data.options.columns.forEach(function (column) {
                    column.index = i++;
                });

                // Finally we can figure out the new style
                e.data.setColumnStyle();
            }

            $(e.data.headerMoveState.title).remove();
            e.data.headerMoveState.title = null;
            $(e.data.headerMoveState.indicator).remove();
            e.data.headerMoveState.indicator = null;
            e.data.headerMoveState.draggingStart = false;
            e.data.headerMoveState.dragging = false;
        },
        sort: function (e) {
            if (e.which !== 1 || e.data.headerResizeState.dragging || e.data.headerMoveState.dragging) {
                return;
            }

            // In the event handler we work with a copy of the element; we only sort when getting data in
            let metaData = e.data.getMetaData();
            let sortColumn = $(this).data('sort-column');

            if (metaData.sortColumn === sortColumn) {
                metaData.sortDescending = !metaData.sortDescending;
            }
            else {
                metaData.sortColumn = sortColumn;
                metaData.sortDescending = false;
            }

            e.data.element.trigger('datagridview.sorted', metaData);
        },
        columnResizeStart: function (e) {
            if (e.which !== 1) {
                return;
            }

            e.data.headerResizeState.dragging = true;
            e.data.headerResizeState.position = e.pageX;
            e.data.headerResizeState.column = $(this).closest('.datagridview-header-cell').data('id');
        },
        columnResize: function (e) {
            if (!e.data.headerResizeState.dragging) {
                return;
            }

            // the shift is expressed, same as column width, as a percentage of the original element
            let tableWidth = Math.min(100, e.data.options.columns.filter(function (c) { return c.visible; }).reduce(function (w, c) { return w + c.width; }, 0));
            let shift = (e.data.headerResizeState.position - e.pageX) / $(e.data.element).width() * tableWidth;
            let column = e.data.options.columns.filter(function (c) { return c.id === e.data.headerResizeState.column; })[0];

            // Adjust shift to only be enough to hide a column fully
            if (column.width - shift < 0) {
                shift = column.width;
            }

            column.width -= shift;

            // Set the new style
            e.data.setColumnStyle();
            e.data.headerResizeState.position = e.pageX;
        },
        columnResizeEnd: function (e) {
            if (e.which !== 1) {
                return;
            }

            let invisibleColumns = e.data.options.columns.filter(function (c) { return c.width <= 0; });

            // If we've made any columns 0 width, then make them invisible
            if (invisibleColumns.length > 0) {
                $.each(invisibleColumns, function () {
                    this.visible = false;
                });

                // Set the new style
                e.data.setColumnStyle();
            }

            e.data.headerResizeState.dragging = false;
        },
        rowSelectStart: function (e) {
            e.data.test = 'rowSelectStart';
            e.data.selectState.selecting = true;
            e.data.selectState.dragElement = $(this);
            e.data.selectState.dragElement.addClass('datagridview-row-selecting');
        },
        rowSelect: function (e) {
            if (!e.data.selectState.selecting) {
                return;
            }

            // Only if we are selecting, and we've entered a new row, are we dragging
            e.data.selectState.dragging = true;

            // This is just to display that we're select-dragging the rows
            let rows = e.data.body.find('.datagridview-row');
            let firstIndex = rows.index(e.data.selectState.dragElement);
            let secondIndex = rows.index(this);
            let dragSelection = rows.slice(Math.min(firstIndex, secondIndex), Math.max(firstIndex, secondIndex) + 1);

            rows.not(dragSelection).removeClass('datagridview-row-selecting');
            dragSelection.addClass('datagridview-row-selecting');
        },
        rowSelectEnd: function (e) {
            if (!e.data.selectState.selecting) {
                return;
            }

            let rows = e.data.body.find('.datagridview-row');

            if (e.data.isMultiselect && e.data.selectState.dragging && e.data.selectState.dragElement) {
                let firstIndex = rows.index(e.data.selectState.dragElement);
                let secondIndex = rows.index(this);

                e.data.alterSelection(rows, rows.slice(Math.min(firstIndex, secondIndex), Math.max(firstIndex, secondIndex) + 1), false, !e.ctrlKey);
            }
            else if (e.data.isMultiselect && e.shiftKey && e.data.selectState.extendElement) {
                let firstIndex = rows.index(e.data.selectState.extendElement);
                let secondIndex = rows.index(this);

                e.data.alterSelection(rows, rows.slice(Math.min(firstIndex, secondIndex), Math.max(firstIndex, secondIndex) + 1), false, !e.ctrlKey);
            }
            else if (e.data.isMultiselect && e.ctrlKey) {
                e.data.alterSelection(rows, $(this), true, false);
                e.data.selectState.extendElement = $(this);
            }
            else {
                e.data.alterSelection(rows, $(this), false, true);
                e.data.selectState.extendElement = $(this);
            }

            // Reset select state
            rows.removeClass('datagridview-row-selecting');
            e.data.selectState.dragElement = null;
            e.data.selectState.selecting = false;
            e.data.selectState.dragging = false;
        }
    }

}(jQuery));

// Datagridview meta data
function DataGridViewMetaData(sortColumn, sortDescending, totalRows, rowsPerPage, page) {
    this.sortColumn = sortColumn;
    this.sortDescending = !!sortDescending;
    this.totalRows = isNaN(totalRows) || totalRows < 0 ? 0 : parseInt(totalRows);
    this.rowsPerPage = isNaN(rowsPerPage) || rowsPerPage < 0 ? 0 : parseInt(rowsPerPage);
    this.page = isNaN(page) || page < 0 ? 0 : parseInt(page);
    this.totalPages = Math.ceil(totalRows / rowsPerPage);

    if (this.page >= this.totalPages) {
        this.page = Math.max(this.totalPages - 1, 0);
    }
}

// When accessing the meta data normally we get a clone
DataGridViewMetaData.prototype.clone = function () {
    return new DataGridViewMetaData(this.sortColumn, this.sortDescending, this.totalRows, this.rowsPerPage, this.page);
}