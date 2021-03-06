goog.provide('jsm.ui.input.Autocomplete');
goog.require('jsm.ui.input.BaseInput');
goog.require('jsm.ui.input.autocomplete.Matcher');

goog.require('goog.ui.AutoComplete');
goog.require('goog.ui.AutoComplete.Renderer');
goog.require('goog.ui.AutoComplete.InputHandler');
goog.require('goog.dom');
goog.require('goog.array');
goog.require('goog.json');


/**
 * An autocomplete text field
 * 
 * @extends jsm.ui.input.BaseInput
 * @constructor
 */
jsm.ui.input.Autocomplete = function(name, label, opt_options) {
	this.lastDisplay_ = '';
	this.lastValue_ = '';
	this.data = [];
    this.matcher_ = null;
	jsm.ui.input.BaseInput.call(this, name, label, opt_options);
};

goog.inherits(jsm.ui.input.Autocomplete, jsm.ui.input.BaseInput);
jsm.ui.input.Autocomplete.Events = jsm.ui.input.BaseInput.Events;

/**
 * @override
 */
jsm.ui.input.Autocomplete.prototype.renderInternal_ = function() {
	if(!this.inputElement_) {
		this.inputElement_ = this.dom_.createDom('input', {
			name : this.name
		});
        var self = this;
	
		var renderer = new goog.ui.AutoComplete.Renderer();
		var inputhandler = new goog.ui.AutoComplete.InputHandler(null, null, false, 300);
		var matcher = this.matcher_ = new jsm.ui.input.autocomplete.Matcher(this.options.get('search_parameter'), 
				this.options.get('url'), 
                function(txt) {
                    self.data = JSON.parse(txt);
                    return goog.array.map(self.data, function(v) {
                        return self.getDisplay_(v);
                    });
                }
       );

       var ac = new goog.ui.AutoComplete(matcher, renderer, inputhandler);

       goog.events.listen(ac, goog.ui.AutoComplete.EventType.UPDATE, function(e) {
           if(e.row !== this.lastDisplay_) {
               this.lastDisplay_ = e.row;
               this.dispatchEvent({
                   type: jsm.ui.input.BaseInput.Events.CHANGE
               });
           }
       }, false, this);

       goog.events.listen(this.inputElement_, 'change', function(e) {
           if(e.target.value !== this.lastDisplay_) {
               this.lastDisplay_ = e.target.value;
               if(e.target.value === '') {
                   this.lastValue_ = '';
               }
               this.dispatchEvent({
                   type: jsm.ui.input.BaseInput.Events.CHANGE
               });
           }
       }, false, this);

       inputhandler.attachAutoComplete(ac);
       inputhandler.attachInputs(this.inputElement_);
    }
    return 	this.inputElement_
};

jsm.ui.input.Autocomplete.prototype.update = function() {
    if(this.matcher_) {
        // dirty hack to update the URL
        this.matcher_.url_ = this.options.get('url');
    }
};

jsm.ui.input.Autocomplete.prototype.getDisplay_ = function(value) {
    return this.options.get('display', value, null)
};

jsm.ui.input.Autocomplete.prototype.getValue_ = function(value) {
    return this.options.get('value', value, function(val, name, context) {
        if(name === '.') {
            return goog.json.serialize(context);
        }
        return val;
    });
};

/**
 * @override
*/
jsm.ui.input.Autocomplete.prototype.getValue = function() {
    var obj = goog.array.find(this.data, function(value) {
        return this.lastDisplay_ == this.getDisplay_(value);
    }, this);
    if(obj) {
        this.lastValue_ = this.getValue_(obj);
    }
    return {value: this.lastValue_, display: this.lastDisplay_};
};

/**
 * @override
*/
jsm.ui.input.Autocomplete.prototype.setValue = function(value) {
    if(!this.inputElement_) this.renderInternal_();
    this.lastDisplay_ = value.display;
    this.lastValue_ = value.value;
    this.inputElement_.value = this.lastDisplay_;
    this.dispatchEvent({
        type: 'change'
    });
};

jsm.ui.input.Autocomplete.prototype.clear = function() {
    this.setValue({value: '', display: ''});    
};
