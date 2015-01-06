var D = require("../../src/D.js")
var assert = require("assert")
var DataArray = require("../../src/DataArray.js")
var DataObject = require("../../src/DataObject.js")
var Promise = require("bluebird")
var _= require("lodash")

/**
 * Define
 */
describe("Define", function(){
  it( "auto definition",function(){
    var autoCol = "post"
    var autoDef = D(autoCol,{})
    assert.equal( autoDef.url.collection,  "/"+autoCol+"/{action}" )
    assert.equal( autoDef.url.single,  "/"+autoCol+"/{id}/{action}" )
  })

  it("custom definition",function(){
    var customCol = "user"
    var customAttr = {
      url : {
        collection : "/prefix/user/{action}",
        single : "/prefix/user/{id}/suffix/{action}"
      }
    }
    var customDef = D(customCol,customAttr)

    assert.equal( customDef.url.collection,  customAttr.url.collection )
    assert.equal( customDef.url.single,  customAttr.url.single )
  })

  //TODO custom primary key

})
