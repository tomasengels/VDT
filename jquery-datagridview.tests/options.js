﻿/// <reference path="options.html" />

describe('a datagridview option', function () {
    it('can be provided for getMetaData', function () {
        var metaData;

        $('#datagridview-options-meta-data').datagridview({
            columns: [],
            getMetaData: function () {
                return new DataGridViewMetaData('test', false, 0, 25, 0);
            }
        }, function () {
                metaData = this.getMetaData();
        });

        expect(metaData.sortColumn).toEqual('test');
    });

    it('can be provided for getFooterPlugins', function () {
        var grid = $('#datagridview-options-footer-plugins');

        grid.datagridview({
            columns: [{ data: 'test' }],
            getFooterPlugins: function () {
                return [
                    $.fn.datagridview.footerPlugins.prevNext,
                    $.fn.datagridview.footerPlugins.displayFull
                ];
            }
        }, function () {
            this.populate(new DataGridViewMetaData('test', false, 2, 25, 0), [
                { test: '1' },
                { test: '2' }
            ])
        });

        expect(grid.find('.datagridview-footer-element').length).toEqual(2);
    });
});