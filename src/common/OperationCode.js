/*globals Sk, define*/
var isNodeJs = typeof module === 'object' && module.exports;
(function(root, factory){
    if(typeof define === 'function' && define.amd) {
        define(['./skulpt.min'], function(){
            return (root.OperationParser = factory(Sk));
        });
    } else if(isNodeJs) {
        require('./skulpt.min');

        module.exports = (root.OperationParser = factory(Sk));
    }
}(this, function(Sk) {
    var OperationCode = function(code, filename) {
        this._lines = code.split('\n');
        this.filename = filename;
    };

    OperationCode.prototype.getName = function() {
        if (!this._schema) this.updateSchema();

        return this._schema.name;
    };

    OperationCode.prototype.getBase = function() {
        if (!this._schema) this.updateSchema();

        return this._schema.base;
    };

    OperationCode.prototype.getOutputs = function() {
        if (!this._schema) this.updateSchema();

        return this._schema.outputs.slice();
    };

    OperationCode.prototype.getInputs = function() {
        if (!this._schema) this.updateSchema();

        return this._schema.inputs.slice();
    };

    OperationCode.prototype.removeInput = function(name) {
        // TODO
    };

    OperationCode.prototype.removeOutput = function(name) {
        // TODO
    };

    OperationCode.prototype.addInput = function(name) {
        // TODO
    };

    OperationCode.prototype.addOutput = function(name) {
        // TODO
    };

    OperationCode.prototype.renameInput = function(oldName, name) {
        // TODO: rename the variable throughout the body
    };

    OperationCode.prototype.renameOutput = function(oldName, name) {
        // TODO: rename the variable throughout the body
    };

    OperationCode.prototype.getCode = function() {
        return this._lines.join('\n');
    };

    OperationCode.prototype.getAst = function () {
        if (this._ast) return this._ast;

        var filename = this.filename || 'operation.py';
        var cst = Sk.parse(filename, this.getCode()).cst;
        var ast = Sk.astFromParse(cst, filename);
        return this._ast = ast;
    };

    OperationCode.prototype._isNodeType = function (node, name) {
        return node.constructor.name === name;
    };

    OperationCode.prototype._parseFn = function (node, schema) {
        var name = node.name.v;

        schema.methods[name] = {};
        // add inputs
        schema.methods[name].inputs = node.args.args.map(arg => {
            return {
                name: arg.id.v,
                value: arg.id.v,
                pos: {
                    line: arg.lineno,
                    col: arg.col_offset
                }
            };
        });

        // add outputs
        var ret = node.body.find(node => this._isNodeType(node, 'Return_'));
        var retVals = [];
        if (ret) {
            retVals = ret.value && this._isNodeType(ret.value, 'Tuple') ?
                ret.value.elts : [ret.value];
        }

        schema.methods[name].outputs = retVals.map((arg, index) => {
            var isNameNode = this._isNodeType(arg, 'Name');
            var name = isNameNode ? arg.id.v : 'result';
            if (!isNameNode && index > 0) {
                name + '_' + index;
            }

            var value = this._isNodeType(arg, 'Num') ? arg.n.v : name;

            return {
                name: name,
                value: value,
                pos: {
                    line: arg.lineno,
                    col: arg.col_offset
                }
            };
        });
    };

    OperationCode.prototype.updateSchema = function () {
        this._schema = this.getSchema();
    };

    OperationCode.prototype.clearSchema = function () {
        this._schema = null;
    };

    OperationCode.prototype.getSchema = function () {
        var schema = {
            name: null,
            base: null,
            methods: {}
        };
        var ast = this.getAst();

        // Find the class definition
        var classDef = ast.body.find(node => this._isNodeType(node, 'ClassDef'));
        if (classDef) {
            schema.name = classDef.name.v;

            // TODO: what if fn is inherited?
            classDef.body
                .filter(node => this._isNodeType(node, 'FunctionDef'))
                .forEach(node => this._parseFn(node, schema));

        }

        schema.inputs = schema.methods.execute.inputs;
        schema.outputs = schema.methods.execute.outputs;
        schema.ast = ast;

        return schema;
    };

    return OperationCode;
}));