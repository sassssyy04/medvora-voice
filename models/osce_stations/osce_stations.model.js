module.exports = (sequelize, Sequelize) => {
  const Osces = sequelize.define(
    "osces",
    {
      osce_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      chapter_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      topic_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      case_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      case_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
    },
    {
      underscored: true,
      timestamps: false,
    }
  );

  return Osces;
};

