﻿describe('a basic rangeslider', function () {
    it('can be created', function () {
        var slider = $('#basic-rangeslider-created');

        expect(slider.length).toEqual(1);
        expect(function () {
            slider.rangeslider();
        }).not.toThrow();
        expect(slider.data('rangeslider')).toBeTruthy();
    });

    it('hides the already present content', function () {
        var slider = $('#basic-rangeslider-hides');

        slider.rangeslider();

        var hiddenContent = slider.find('.test-hidden');

        expect($(hiddenContent[0]).css('display')).toEqual('none');
        expect($(hiddenContent[1]).css('display')).toEqual('none');
    });

    it('will add a class', function () {
        var slider = $('#basic-rangeslider-class');

        slider.rangeslider();
        expect(slider.hasClass('rangeslider')).toEqual(true);
    });

    it('will add a track', function () {
        var slider = $('#basic-rangeslider-track');

        slider.rangeslider();
        expect(slider.find('div.rangeslider-track').length).toEqual(1);
    });

    it('will add a thumb', function () {
        var slider = $('#basic-rangeslider-thumb');

        slider.rangeslider();
        expect(slider.find('div.rangeslider-thumb').length).toEqual(1);
    });

    it('will add a hidden input', function () {
        var slider = $('#basic-rangeslider-input');

        slider.rangeslider();

        var input = slider.find('input.rangeslider-input[type="hidden"]');

        expect(input.length).toEqual(1);
        expect(input.attr('name')).toEqual('test');
    });
});