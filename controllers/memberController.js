const { getBoardRole, canRead, canWrite, denied } = require("../utils/boardAccess");
const User = require("../models/User");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");
const BoardMember = require("../models/BoardMember");
const Card = require("../models/Card");
const createActivity = require("../utils/createActivity");

const List = require("../models/List");

// Users who belong to a board: its members plus the workspace owner
const getBoardUsers = async (board) => {
  const [workspace, memberships] = await Promise.all([
    Workspace.findByPk(board.workspaceId, { attributes: ["userId"] }),
    BoardMember.findAll({ where: { boardId: board.id }, attributes: ["userId"] }),
  ]);

  const userIds = new Set(memberships.map((m) => m.userId));
  if (workspace) userIds.add(workspace.userId);

  return User.findAll({
    where: { id: [...userIds] },
    attributes: ["id", "name", "email"],
    order: [["name", "ASC"]],
  });
};


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


    const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
    }


    const members = await getBoardUsers(board);


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



    const role = await getBoardRole(req.user.id, board);
    if (!canWrite(role)) {
      return denied(res);
    }





    const existing = await card.hasMember(user);

    // Only people on the board can be newly assigned to a card
    if (!existing) {
      const boardUsers = await getBoardUsers(board);

      if (!boardUsers.some((u) => u.id === user.id)) {
        return res.status(400).json({
          success: false,
          message: "User is not a member of this board",
        });
      }
    }



    if(existing){

      await card.removeMember(user);
      await createActivity(`removed ${user.name} from this card`, card.id, req.user.id);


      return res.status(200).json({
        success:true,
        assigned:false,
        message:"Member removed from card",
      });


    }
    else{


      await card.addMember(user);
      await createActivity(`assigned ${user.name} to this card`, card.id, req.user.id);


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



const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
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