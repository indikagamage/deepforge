/* globals define*/
var isNodeJs = typeof module === 'object' && module.exports;
(function(root, factory){
    if(typeof define === 'function' && define.amd) {
        // TODO: Load the brython script
        define(['./brython'], function(brython){
            if (isNodeJs) {
                brython.$py_module_path['__main__']='./';
            } else {
                brython = window.__BRYTHON__;
            }
            return (root.OperationParser = factory(brython, console.assert));
        });
    } else if(isNodeJs) {
        var brython = require('./node-brython'),
            assert = require('assert');

        module.exports = (root.OperationParser = factory(brython, assert));
    }
}(this, function(brython, assert) {
    var OperationParser = {};

    // The provided tree gives us contexts which can have associated 'C'
    function traverse(node, fn) {
        var i;
        if (node.children) {
            for (i = node.children.length; i--;) {
                traverse(node.children[i], fn);
                fn(node.children[i]);
            }
        }
        if (node.C && node.C.tree) {
            for (i = node.C.tree.length; i--;) {
                traverse(node.C.tree[i], fn);
                fn(node.C.tree[i]);
            }
        }
    }

    function isClass(node) {
        return node.type === 'class';
    }

    function getBaseClass(node) {
        assert(node.type === 'class');
        var baseNode = node.args.tree[0];
        return baseNode ? baseNode.tree[0].tree[0].value : null;
    }

    function parseOperationAst(root) {
        var schema = {
            name: null,
            base: null,
            methods: {}
        };

        traverse(root, node => {
            // Get the class for the given function
            if (isClass(node)) {
                schema.name = node.name;
                schema.base = getBaseClass(node);

                traverse(node.parent.node, n => {
                    if (n.type === 'def' && n.name === 'execute') {
                        delete n.parent;
                        schema.methods[n.name] = n.args.map(arg => {
                            return {
                                name: arg,
                                type: null  // TODO
                            };
                        })
                        .filter((node, index) => !(node.name === 'self' && index === 0));
                        // TODO: get the outputs of the method...
                    }
                });
            }

            // How can I get from the class ctx to the methods?
            if (node.type === 'def') {
                var clazz = node.scope.C.tree.find(ctx => ctx.type === 'class');
            }
        });

        schema.inputs = schema.methods.execute;
        return schema;
    }

    OperationParser._traverse = traverse;
    OperationParser._getClass = function(src) {
    };

    OperationParser._getAst = function(src) {
        var ast = brython.py2js(src,'__main__', '__main__', '__builtins__');
        return ast;
    };

    OperationParser.parse = function(src) {
        try {
            var ast = brython.py2js(src,'__main__', '__main__', '__builtins__');
            var schema = parseOperationAst(ast);
            return schema;
        } catch (e) {
            console.error('operation parsing failed:', e);
            return null;
        }
    };

    return OperationParser;
}));