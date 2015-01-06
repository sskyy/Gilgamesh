var D = require("../../src/D.js")
var assert = require("assert")
var DataArray = require("../../src/DataArray.js")
var DataObject = require("../../src/DataObject.js")
var Promise = require("bluebird")
var _= require("lodash")

/**
 * GET
 */
describe("Get Object", function(){
  //overwrite get method to mock request
  var idToGet = 1
  var userList = [{
    id : idToGet,
    name : "Gilgamesh"
  },{
    id: idToGet+1,
    name : "Enkidu"
  }]

  beforeEach(function(){
    D("user",{
      query : function(  settings ){
        if( (new RegExp(idToGet+"$")).test( settings.url)  ){
          return new Promise(function( resolve){
            setTimeout(function(){
              resolve(userList[0])
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



  it("get a list",function( done){
    var getUserList = D("user").get()

    assert.equal( getUserList instanceof  DataArray, true )
    getUserList.onStatus("$$filled",function( filled){
      if( filled){
        assert.equal( getUserList.length , userList.length )
        assert.equal( getUserList[0] instanceof DataObject, true )
        done()
      }
    })
  })

  it("apply array method on list", function(done){
    var getUserList = D("user").get()

    assert.equal( getUserList instanceof  DataArray, true )
    getUserList.onStatus("$$filled",function( filled){
      if( filled){
        //push
        var originLength = getUserList.length
        getUserList.push({id:3,name:"Arthur"})
        assert.equal( getUserList.length , originLength + 1 )
        assert.equal( getUserList[getUserList.length-1 ] instanceof  DataObject,true)
        //pop
        getUserList.pop()
        assert.equal( getUserList.length , originLength )

        //filter
        var slice1 = getUserList.filter("id",idToGet)
        assert.equal( slice1 instanceof DataArray, true)
        assert.equal( slice1.length, 1)
        assert.equal( slice1[0] instanceof DataObject,true)
        assert.equal( slice1[0].id, idToGet)
        done()
      }
    })
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
})

