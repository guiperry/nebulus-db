package server

import (
	"context"
	"fmt"
	"log"
	"net"

	"google.golang.org/grpc"

	"github.com/nebulus-db/packages/adapter-chromadb/adapter"
	pb "github.com/nebulus-db/packages/adapter-chromadb/go-adapter/proto"
)

type Server struct {
	pb.UnimplementedChromemAdapterServer
	adapter *adapter.ChromemAdapter
}

func NewServer(chromaURL string) (*Server, error) {
	adp, err := adapter.NewChromemAdapter(chromaURL)
	if err != nil {
		return nil, err
	}

	return &Server{
		adapter: adp,
	}, nil
}

func (s *Server) Load(ctx context.Context, req *pb.LoadRequest) (*pb.LoadResponse, error) {
	data, err := s.adapter.Load(ctx)
	if err != nil {
		return nil, err
	}

	// Convert to protobuf format
	pbData := make(map[string]*pb.DocumentList)
	for collectionName, documents := range data {
		pbDocs := make([]*pb.Document, len(documents))
		for i, doc := range documents {
			pbDocs[i] = &pb.Document{
				Id:        doc.ID,
				Text:      doc.Text,
				Embedding: doc.Embedding,
				Data:      convertMapToStringMap(doc.Data),
			}
		}
		pbData[collectionName] = &pb.DocumentList{Documents: pbDocs}
	}

	return &pb.LoadResponse{Data: pbData}, nil
}

func (s *Server) Save(ctx context.Context, req *pb.SaveRequest) (*pb.SaveResponse, error) {
	// Convert from protobuf format
	data := make(map[string][]adapter.Document)
	for collectionName, docList := range req.Data {
		docs := make([]adapter.Document, len(docList.Documents))
		for i, pbDoc := range docList.Documents {
			docs[i] = adapter.Document{
				ID:        pbDoc.Id,
				Text:      pbDoc.Text,
				Embedding: pbDoc.Embedding,
				Data:      convertStringMapToMap(pbDoc.Data),
			}
		}
		data[collectionName] = docs
	}

	err := s.adapter.Save(ctx, data)
	if err != nil {
		return &pb.SaveResponse{Success: false, Error: err.Error()}, nil
	}

	return &pb.SaveResponse{Success: true}, nil
}

func (s *Server) VectorSearch(ctx context.Context, req *pb.VectorSearchRequest) (*pb.VectorSearchResponse, error) {
	filter := convertStringMapToMap(req.Filter)

	results, err := s.adapter.VectorSearch(ctx, req.CollectionName, req.QueryText, int(req.Limit), filter)
	if err != nil {
		return nil, err
	}

	// Convert to protobuf format
	pbResults := make([]*pb.VectorSearchResult, len(results))
	for i, result := range results {
		pbResults[i] = &pb.VectorSearchResult{
			Document: &pb.Document{
				Id:        result.Document.ID,
				Text:      result.Document.Text,
				Embedding: result.Document.Embedding,
				Data:      convertMapToStringMap(result.Document.Data),
			},
			Distance: result.Distance,
			Score:    result.Score,
		}
	}

	return &pb.VectorSearchResponse{Results: pbResults}, nil
}

func (s *Server) ConfigureCollection(ctx context.Context, req *pb.ConfigureCollectionRequest) (*pb.ConfigureCollectionResponse, error) {
	config := &adapter.CollectionConfig{
		EmbeddingModel:    req.Config.EmbeddingModel,
		EmbeddingProvider: req.Config.EmbeddingProvider,
		DistanceFunction:  req.Config.DistanceFunction,
		TextField:         req.Config.TextField,
		HNSWConfig:        convertStringMapToMap(req.Config.HnswConfig),
	}

	err := s.adapter.ConfigureCollection(ctx, req.CollectionName, config)
	if err != nil {
		return &pb.ConfigureCollectionResponse{Success: false, Error: err.Error()}, nil
	}

	return &pb.ConfigureCollectionResponse{Success: true}, nil
}

func (s *Server) Close(ctx context.Context, req *pb.CloseRequest) (*pb.CloseResponse, error) {
	err := s.adapter.Close()
	if err != nil {
		return &pb.CloseResponse{Success: false}, nil
	}

	return &pb.CloseResponse{Success: true}, nil
}

func (s *Server) Start(port int) error {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterChromemAdapterServer(grpcServer, s)

	log.Printf("gRPC server listening on port %d", port)
	return grpcServer.Serve(lis)
}

// Helper functions

func convertMapToStringMap(m map[string]interface{}) map[string]string {
	result := make(map[string]string)
	for k, v := range m {
		result[k] = fmt.Sprintf("%v", v)
	}
	return result
}

func convertStringMapToMap(m map[string]string) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range m {
		result[k] = v
	}
	return result
}
