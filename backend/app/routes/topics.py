from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2 import Error as PostgreSQLError
import uuid
from typing import List

from app.models.topic import (
    CreateTopicRequest, UpdateTopicRequest,
    TopicResponse, TopicListResponse, TopicDetailResponse
)
from app.database import get_db, get_dict_cursor
from app.auth import get_current_user

router = APIRouter(prefix="/topics", tags=["Topics"])

@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    request: CreateTopicRequest,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Buat topik baru (e.g., "Materi Python", "Kalkulus 1")
    """
    cursor = get_dict_cursor(db)

    try:
        topic_id = str(uuid.uuid4())

        cursor.execute(
            """
            INSERT INTO topics (id, user_id, name, description)
            VALUES (%s, %s, %s, %s)
            """,
            (topic_id, user_id, request.name, request.description)
        )
        db.commit()

        # Get created topic
        cursor.execute(
            "SELECT * FROM topics WHERE id = %s",
            (topic_id,)
        )
        topic = cursor.fetchone()

        return TopicResponse(
            id=topic['id'],
            user_id=topic['user_id'],
            name=topic['name'],
            description=topic['description'],
            created_at=topic['created_at'],
            updated_at=topic['updated_at'],
            document_count=0,
            chat_count=0,
            quiz_count=0
        )

    except PostgreSQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

@router.get("", response_model=TopicListResponse)
def get_topics(
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get semua topik milik user dengan stats (document count, chat count, quiz count)
    """
    cursor = get_dict_cursor(db)

    try:
        # Get topics dengan counts
        cursor.execute(
            """
            SELECT
                t.id, t.user_id, t.name, t.description, t.created_at, t.updated_at,
                COUNT(DISTINCT d.id) as document_count,
                COUNT(DISTINCT cs.id) as chat_count,
                COUNT(DISTINCT q.id) as quiz_count
            FROM topics t
            LEFT JOIN documents d ON t.id = d.subject_id
            LEFT JOIN chat_sessions cs ON t.id = cs.subject_id
            LEFT JOIN quizzes q ON t.id = q.subject_id
            WHERE t.user_id = %s
            GROUP BY t.id
            ORDER BY t.updated_at DESC
            """,
            (user_id,)
        )
        topics = cursor.fetchall()

        topic_list = [
            TopicResponse(
                id=t['id'],
                user_id=t['user_id'],
                name=t['name'],
                description=t['description'],
                created_at=t['created_at'],
                updated_at=t['updated_at'],
                document_count=t['document_count'],
                chat_count=t['chat_count'],
                quiz_count=t['quiz_count']
            )
            for t in topics
        ]

        return TopicListResponse(
            topics=topic_list,
            total=len(topic_list)
        )

    finally:
        cursor.close()

@router.get("/{topic_id}", response_model=TopicDetailResponse)
def get_topic(
    topic_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get detail topik by ID dengan stats
    """
    cursor = get_dict_cursor(db)

    try:
        cursor.execute(
            """
            SELECT
                t.id, t.user_id, t.name, t.description, t.created_at, t.updated_at,
                COUNT(DISTINCT d.id) as document_count,
                COUNT(DISTINCT cs.id) as chat_count,
                COUNT(DISTINCT q.id) as quiz_count
            FROM topics t
            LEFT JOIN documents d ON t.id = d.subject_id
            LEFT JOIN chat_sessions cs ON t.id = cs.subject_id
            LEFT JOIN quizzes q ON t.id = q.subject_id
            WHERE t.id = %s AND t.user_id = %s
            GROUP BY t.id
            """,
            (topic_id, user_id)
        )
        topic = cursor.fetchone()

        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )

        return TopicDetailResponse(
            id=topic['id'],
            user_id=topic['user_id'],
            name=topic['name'],
            description=topic['description'],
            created_at=topic['created_at'],
            updated_at=topic['updated_at'],
            document_count=topic['document_count'],
            chat_count=topic['chat_count'],
            quiz_count=topic['quiz_count']
        )

    finally:
        cursor.close()

@router.put("/{topic_id}", response_model=TopicResponse)
def update_topic(
    topic_id: str,
    request: UpdateTopicRequest,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Update nama/deskripsi topik
    """
    cursor = get_dict_cursor(db)

    try:
        # Verify topic exists & owned by user
        cursor.execute(
            "SELECT id FROM topics WHERE id = %s AND user_id = %s",
            (topic_id, user_id)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )

        # Build update query dynamically
        updates = []
        params = []

        if request.name is not None:
            updates.append("name = %s")
            params.append(request.name)

        if request.description is not None:
            updates.append("description = %s")
            params.append(request.description)

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        params.append(topic_id)

        cursor.execute(
            f"UPDATE topics SET {', '.join(updates)} WHERE id = %s",
            params
        )
        db.commit()

        # Get updated topic with counts
        cursor.execute(
            """
            SELECT
                t.id, t.user_id, t.name, t.description, t.created_at, t.updated_at,
                COUNT(DISTINCT d.id) as document_count,
                COUNT(DISTINCT cs.id) as chat_count,
                COUNT(DISTINCT q.id) as quiz_count
            FROM topics t
            LEFT JOIN documents d ON t.id = d.subject_id
            LEFT JOIN chat_sessions cs ON t.id = cs.subject_id
            LEFT JOIN quizzes q ON t.id = q.subject_id
            WHERE t.id = %s
            GROUP BY t.id
            """,
            (topic_id,)
        )
        topic = cursor.fetchone()

        return TopicResponse(
            id=topic['id'],
            user_id=topic['user_id'],
            name=topic['name'],
            description=topic['description'],
            created_at=topic['created_at'],
            updated_at=topic['updated_at'],
            document_count=topic['document_count'],
            chat_count=topic['chat_count'],
            quiz_count=topic['quiz_count']
        )

    except PostgreSQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(
    topic_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Delete topik (cascade delete semua documents, chats, quizzes di topik ini)
    """
    cursor = get_dict_cursor(db)

    try:
        # Verify topic exists & owned by user
        cursor.execute(
            "SELECT id FROM topics WHERE id = %s AND user_id = %s",
            (topic_id, user_id)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )

        # Delete topic (CASCADE akan auto delete documents, chats, quizzes)
        cursor.execute(
            "DELETE FROM topics WHERE id = %s",
            (topic_id,)
        )
        db.commit()

        # TODO: Delete vector embeddings dari ChromaDB untuk semua dokumen dalam topik ini
        # Akan ditambahkan di step berikutnya

        return None

    except PostgreSQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()
