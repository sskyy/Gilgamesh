var D = require("../../src/D.js")
var assert = require("assert")
var DataArray = require("../../src/DataArray.js")
var DataObject = require("../../src/DataObject.js")
var Promise = require("bluebird")

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


describe("Get", function(){
  //overwrite get method to mock request
  var idToGet = 1
  var user = {
    id : idToGet,
    name : "Gilgamesh"
  }
  var userList = [user]

  beforeEach(function(){
    D("user",{
      query : function(  settings ){
        if( (new RegExp(idToGet+"$")).test( settings.url)  ){
          return new Promise(function( resolve){
            setTimeout(function(){
              resolve(user)
            },100)
          })
        }else{
          return new Promise(function( resolve){
            setTimeout(function(){
              resolve(userList)
            },100)
          })
        }
      }
    })
  })


  it("get a list",function(){
    var userList = D("user").get()
    assert.equal( userList instanceof  DataArray, true )
    assert.notEqual( userList.length , undefined )
  })

  it("get a certain object", function( done ){
    var userObject = D("user").get(idToGet)
    assert.equal( userObject instanceof  DataObject, true )
    userObject.onStatus("$$filled", function( filled ){
      if( filled ){
        assert.equal( userObject.id, idToGet )
        //done()
      }
    })

    var userObject2 = D("user").get({id:idToGet})
    userObject2.onStatus("$$filled", function( filled ){
      if( filled ){
        assert.equal( userObject2.id, idToGet )
        done()
      }
    })
  })

  //TODO use custom primary key to get
})

describe("Save & Delete & Validate & Watch", function(){

})

describe("Actions", function(){

})

describe("Status", function(){

})

describe("Hooks", function(){

})