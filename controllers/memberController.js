const User = require("../models/User");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");
const Card = require("../models/Card");
const List = require("../models/List");


const getBoardMembers = async (req, res) => {
  try {

    const { boardId } = req.params;

    const board = await Board.findByPk(boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }


    const workspace = await Workspace.findOne({
      where: {
        id: board.workspaceId,
        userId: req.user.id,
      },
    });


    if (!workspace) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }


    const members = await User.findAll({
      attributes: [
        "id",
        "name",
        "email"
      ],
      order: [
        ["name", "ASC"]
      ],
    });


    return res.status(200).json({
      success: true,
      members,
    });


  } catch (error) {

    console.log("Get Board Members Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};





const toggleMember = async (req, res) => {
  try {

    const { cardId, userId } = req.params;


    const card = await Card.findByPk(cardId);


    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }



    const user = await User.findByPk(userId);


    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }



    const list = await List.findByPk(card.listId);

    const board = await Board.findByPk(list.boardId);



    const workspace = await Workspace.findOne({
      where:{
        id: board.workspaceId,
        userId:req.user.id,
      },
    });



    if(!workspace){
      return res.status(403).json({
        success:false,
        message:"Access denied",
      });
    }





    const existing = await card.hasMember(user);



    if(existing){

      await card.removeMember(user);


      return res.status(200).json({
        success:true,
        assigned:false,
        message:"Member removed from card",
      });


    }
    else{


      await card.addMember(user);


      return res.status(200).json({
        success:true,
        assigned:true,
        message:"Member assigned to card",
      });


    }



  } catch(error){


    console.log("Toggle Member Error:",error);


    return res.status(500).json({
      success:false,
      message:"Internal Server Error",
    });


  }
};






const getCardMembers = async (req,res)=>{

try{


const { cardId } = req.params;



const card = await Card.findByPk(cardId,{

include:[
  {
    model:User,
    as:"members",
    attributes:[
      "id",
      "name",
      "email"
    ],
    through:{
      attributes:[]
    },
  },
],


});



if(!card){

return res.status(404).json({

success:false,
message:"Card not found",

});

}




const list = await List.findByPk(card.listId);

const board = await Board.findByPk(list.boardId);



const workspace = await Workspace.findOne({

where:{
id:board.workspaceId,
userId:req.user.id,
}

});



if(!workspace){

return res.status(403).json({

success:false,
message:"Access denied",

});

}





return res.status(200).json({

success:true,

members:card.members,

});



}
catch(error){


console.log("Get Card Members Error:",error);


return res.status(500).json({

success:false,
message:"Internal Server Error",

});


}


};





module.exports = {

getBoardMembers,
toggleMember,
getCardMembers,

};